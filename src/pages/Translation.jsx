import React, { useState, useEffect } from 'react';
import { checkTranslations, generateSentences, getItems, addItem, updateItem, deleteItem } from '../services/api';
import { ArrowLeft, CheckSquare, Square, History, PlusCircle, Trash2, CheckCircle2, Clock, Sparkles } from 'lucide-react';

const Translation = () => {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [mode, setMode] = useState('select'); // 'select' | 'translate'
  
  // Data state
  const [vocabs, setVocabs] = useState([]);
  const [grammars, setGrammars] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Selection state
  const [selectedVocabs, setSelectedVocabs] = useState([]);
  const [selectedGrammars, setSelectedGrammars] = useState([]);
  
  // Current active exercise state
  const [currentExercise, setCurrentExercise] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllData = async () => {
    try {
      const [v, g, ex] = await Promise.all([
        getItems('vocab'),
        getItems('grammar'),
        getItems('exercise')
      ]);
      setVocabs(v || []);
      setGrammars(g || []);
      
      // Filter and sort exercises by newest createdAt or id
      const validEx = (ex || []).filter(item => item.sentences && Array.isArray(item.sentences));
      const sortedEx = validEx.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setExercises(sortedEx);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const toggleVocab = (vocab) => {
    if (selectedVocabs.find(v => v.id === vocab.id)) {
      setSelectedVocabs(selectedVocabs.filter(v => v.id !== vocab.id));
    } else {
      setSelectedVocabs([...selectedVocabs, vocab]);
    }
  };

  const toggleGrammar = (grammar) => {
    if (selectedGrammars.find(g => g.id === grammar.id)) {
      setSelectedGrammars(selectedGrammars.filter(g => g.id !== grammar.id));
    } else {
      setSelectedGrammars([...selectedGrammars, grammar]);
    }
  };

  // Generate title formatted as requested:
  // e.g. Bài tập ôn tập "食べる, 飲む" 1 ngày 7-8-2026
  const generateExerciseTitle = (targetNames) => {
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const dateStr = `${d}-${m}-${y}`;

    // Count existing exercises created today with the same target
    const existingCountToday = exercises.filter(
      ex => ex.date === dateStr && ex.targetNames === targetNames
    ).length;

    const sequence = existingCountToday + 1;
    const title = `Bài tập ôn tập "${targetNames}" ${sequence} ngày ${dateStr}`;
    return { title, date: dateStr, sequence };
  };

  const handleGenerate = async () => {
    if (selectedVocabs.length === 0 && selectedGrammars.length === 0) {
      alert("単語または文法を少なくとも1つ選択してください。");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const payload = {
        vocabs: selectedVocabs.map(v => v.word),
        grammars: selectedGrammars.map(g => g.title)
      };
      
      const targetNames = [
        ...selectedVocabs.map(v => v.word),
        ...selectedGrammars.map(g => g.title)
      ].join(', ');

      const response = await generateSentences(payload);
      if (response.result && Array.isArray(response.result)) {
        const generatedSentences = response.result;
        const initialAnswers = Array(generatedSentences.length).fill('');
        
        // Auto-generate title with requested date format
        const { title, date, sequence } = generateExerciseTitle(targetNames);
        
        // Save new exercise to database
        const newExercisePayload = {
          title,
          date,
          sequence,
          targetNames,
          vocabs: selectedVocabs.map(v => v.word),
          grammars: selectedGrammars.map(g => g.title),
          sentences: generatedSentences,
          answers: initialAnswers,
          feedback: null,
          completed: false,
          createdAt: new Date().toISOString()
        };

        const savedItem = await addItem('exercise', newExercisePayload);
        
        // Update local state
        setExercises(prev => [savedItem, ...prev]);
        setCurrentExercise(savedItem);
        setSentences(generatedSentences);
        setAnswers(initialAnswers);
        setFeedback(null);
        setMode('translate');
      } else {
        throw new Error("Invalid response format from AI");
      }
    } catch (err) {
      console.error(err);
      setError("質問の作成中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExercise = (exercise) => {
    setCurrentExercise(exercise);
    setSentences(exercise.sentences || []);
    setAnswers(exercise.answers || Array((exercise.sentences || []).length).fill(''));
    setFeedback(exercise.feedback || null);
    setError(null);
    setMode('translate');
  };

  const handleDeleteExercise = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("この練習問題を削除してもよろしいですか？")) return;
    try {
      await deleteItem('exercise', id);
      setExercises(prev => prev.filter(ex => ex.id !== id));
      if (currentExercise?.id === id) {
        setMode('select');
        setCurrentExercise(null);
      }
    } catch (err) {
      console.error("Error deleting exercise:", err);
    }
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.every(a => a.trim() === '')) {
      alert("提出する前に少なくとも1つの文を翻訳してください。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = answers.map((ans, idx) => ({
        original: sentences[idx],
        translated: ans
      })).filter(item => item.translated.trim() !== ''); 

      const response = await checkTranslations(payload);
      
      const feedbackMap = {};
      let resultIdx = 0;
      answers.forEach((ans, idx) => {
        if (ans.trim() !== '') {
          feedbackMap[idx] = response.result[resultIdx];
          resultIdx++;
        }
      });
      setFeedback(feedbackMap);

      // Save answers and AI feedback to database
      if (currentExercise?.id) {
        await updateItem('exercise', currentExercise.id, {
          answers,
          feedback: feedbackMap,
          completed: true,
          updatedAt: new Date().toISOString()
        });

        setExercises(prev => prev.map(ex => 
          ex.id === currentExercise.id 
            ? { ...ex, answers, feedback: feedbackMap, completed: true } 
            : ex
        ));
      }
      
    } catch (err) {
      console.error(err);
      setError("AI APIの呼び出し中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // SELECT / DASHBOARD VIEW
  if (mode === 'select') {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <h1 className="mb-2">翻訳 & AI練習</h1>
        <p className="mb-6 text-muted">AIが文脈に合った練習問題を生成し、翻訳を自動採点・添削します。</p>

        {/* Tab Switcher */}
        <div className="flex gap-3 mb-8 border-b border-white/10 pb-4">
          <button 
            className={`btn flex items-center gap-2 ${activeTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('new')}
          >
            <PlusCircle size={18} /> 新規作成
          </button>
          <button 
            className={`btn flex items-center gap-2 ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} /> 保存した練習一覧 ({exercises.length})
          </button>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border-l-4 border-red-500 p-4 mb-8">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {loadingData ? (
          <p>データを読み込み中...</p>
        ) : activeTab === 'new' ? (
          // TAB 1: CREATE NEW EXERCISE
          <div>
            <p className="mb-4 text-sm text-gray-300">復習したい単語や文法を選択してください：</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Vocab Selection */}
              <div className="glass-panel p-4">
                <h2 className="text-xl mb-4 text-indigo-400">学習した単語</h2>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {vocabs.map(v => (
                    <div 
                      key={v.id} 
                      className="flex items-center gap-3 p-3 bg-white/5 rounded cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => toggleVocab(v)}
                    >
                      {selectedVocabs.find(sv => sv.id === v.id) ? <CheckSquare className="text-primary" /> : <Square className="text-muted" />}
                      <div>
                        <p className="jp-text text-lg">{v.word}</p>
                        <p className="text-sm text-muted">{v.meaning}</p>
                      </div>
                    </div>
                  ))}
                  {vocabs.length === 0 && <p className="text-muted text-sm">単語がありません。</p>}
                </div>
              </div>

              {/* Grammar Selection */}
              <div className="glass-panel p-4">
                <h2 className="text-xl mb-4 text-pink-400">学習した文法</h2>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {grammars.map(g => (
                    <div 
                      key={g.id} 
                      className="flex items-center gap-3 p-3 bg-white/5 rounded cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => toggleGrammar(g)}
                    >
                      {selectedGrammars.find(sg => sg.id === g.id) ? <CheckSquare className="text-primary" /> : <Square className="text-muted" />}
                      <div>
                        <p className="jp-text text-lg">{g.title}</p>
                        <p className="text-sm text-muted">{g.meaning}</p>
                      </div>
                    </div>
                  ))}
                  {grammars.length === 0 && <p className="text-muted text-sm">文法がありません。</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end sticky bottom-8">
              <button 
                className="btn btn-primary text-lg px-8 py-4 shadow-xl flex items-center gap-2" 
                onClick={handleGenerate}
                disabled={loading || (selectedVocabs.length === 0 && selectedGrammars.length === 0)}
              >
                <Sparkles size={20} />
                {loading ? 'AIが問題を作成・保存中...' : '翻訳練習を作成して保存'}
              </button>
            </div>
          </div>
        ) : (
          // TAB 2: SAVED EXERCISES HISTORY
          <div className="space-y-4">
            {exercises.length === 0 ? (
              <div className="glass-panel p-12 text-center">
                <History size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-xl text-muted mb-2">まだ保存された練習問題がありません</p>
                <p className="text-sm text-gray-400 mb-6">「新規作成」タブから単語や文法を選んで問題を作成しましょう。</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('new')}>
                  今すぐ作成する
                </button>
              </div>
            ) : (
              exercises.map((ex) => (
                <div 
                  key={ex.id}
                  className="glass-panel p-5 hover:bg-white/10 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                  onClick={() => handleOpenExercise(ex)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-white">{ex.title}</h3>
                      {ex.completed ? (
                        <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2.5 py-0.5 rounded-full border border-green-500/30">
                          <CheckCircle2 size={12} /> 採点済み (済)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-300 px-2.5 py-0.5 rounded-full border border-yellow-500/30">
                          <Clock size={12} /> 未完了
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 text-xs text-muted">
                      <span>📝 {(ex.sentences || []).length} センテンス</span>
                      <span>📅 {ex.date || '日付なし'}</span>
                      {ex.targetNames && <span className="jp-text text-pink-300">🎯 {ex.targetNames}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button 
                      className="btn btn-secondary text-sm"
                      onClick={() => handleOpenExercise(ex)}
                    >
                      {ex.completed ? '結果を見る / やり直す' : '練習を続ける'}
                    </button>
                    <button 
                      className="btn btn-danger text-sm p-2"
                      onClick={(e) => handleDeleteExercise(ex.id, e)}
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // TRANSLATE MODE
  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button 
          className="btn btn-secondary flex items-center gap-2"
          onClick={() => {
            setMode('select');
            fetchAllData(); // Refresh history
          }}
        >
          <ArrowLeft size={16} /> 一覧に戻る
        </button>

        {currentExercise?.title && (
          <span className="text-sm bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg">
            {currentExercise.title}
          </span>
        )}
      </div>

      <h1 className="mb-2">翻訳 & AIチェック</h1>
      <p className="mb-8 text-muted">次の文を日本語に翻訳してください。AI (Groq) がチェックし、結果を自動保存します。</p>

      {error && (
        <div className="bg-red-500/20 border-l-4 border-red-500 p-4 mb-8">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-6 mb-8">
        {sentences.map((sentence, idx) => (
          <div key={idx} className="glass-panel p-6">
            <h3 className="mb-4 text-lg font-medium text-white">{idx + 1}. {sentence}</h3>
            <textarea
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 jp-text text-white focus:border-primary focus:outline-none transition-colors mb-2"
              rows={2}
              placeholder="ここに日本語の翻訳を入力してください..."
              value={answers[idx] || ''}
              onChange={(e) => handleAnswerChange(idx, e.target.value)}
            />
            
            {feedback && feedback[idx] && (
              <div className={`ai-feedback animate-fade-in ${feedback[idx].isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="flex gap-2 items-start mb-2">
                  <span className="font-bold">{feedback[idx].isCorrect ? '✅ 良い' : '❌ 修正が必要'}</span>
                </div>
                <p className="mb-2 text-sm text-gray-300">{feedback[idx].feedback}</p>
                <div className="bg-black/30 p-3 rounded mt-2">
                  <span className="text-xs text-primary block mb-1">おすすめの訳:</span>
                  <p className="jp-text text-white">{feedback[idx].suggestedTranslation}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end sticky bottom-8">
        <button 
          className="btn btn-primary text-lg px-8 py-4 shadow-xl flex items-center gap-2" 
          onClick={handleSubmit}
          disabled={loading}
        >
          <Sparkles size={20} />
          {loading ? 'AIが採点・保存中...' : '提出してAI判定 (保存)'}
        </button>
      </div>
    </div>
  );
};

export default Translation;
