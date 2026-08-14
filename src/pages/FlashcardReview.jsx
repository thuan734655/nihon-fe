import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getItems, updateItem } from '../services/api';
import { BookOpen, Calendar, ArrowLeft, ArrowRightLeft } from 'lucide-react';

// SRS intervals
const SRS_INTERVALS = [1, 2, 4, 7, 14, 30, 90, 180];

const FlashcardReview = () => {
  const location = useLocation();
  const [mode, setMode] = useState('setup'); // 'setup' | 'review'
  const [direction, setDirection] = useState('ja_to_vi'); // 'ja_to_vi' | 'vi_to_ja'
  
  // Setup state
  const [allData, setAllData] = useState({ vocabs: [], grammars: [] });
  const [topics, setTopics] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  
  // Review state
  const [itemsToReview, setItemsToReview] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const fetchAllData = async () => {
    try {
      const vocabs = await getItems('vocab');
      const grammars = await getItems('grammar');
      
      const now = new Date();
      const vMapped = vocabs.filter(v => v.inReviewCycle !== false).map(v => ({ ...v, itemType: 'vocab' }));
      const gMapped = grammars.filter(g => g.inReviewCycle !== false).map(g => ({ ...g, itemType: 'grammar' }));
      
      setAllData({ vocabs: vMapped, grammars: gMapped });
      
      // Count due items
      const dueVocabs = vMapped.filter(v => new Date(v.nextReviewDate) <= now);
      const dueGrammars = gMapped.filter(g => new Date(g.nextReviewDate) <= now);
      setDueCount(dueVocabs.length + dueGrammars.length);
      
      // Extract unique topics
      const allTopics = new Set();
      [...vMapped, ...gMapped].forEach(item => {
        if (item.topic && item.topic.trim() !== '') {
          allTopics.add(item.topic.trim());
        }
      });
      setTopics(Array.from(allTopics).sort());
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [location.pathname]);

  const startReviewDue = () => {
    const now = new Date();
    const dueVocabs = allData.vocabs.filter(v => new Date(v.nextReviewDate) <= now);
    const dueGrammars = allData.grammars.filter(g => new Date(g.nextReviewDate) <= now);
    
    const allDue = [...dueVocabs, ...dueGrammars].sort(() => Math.random() - 0.5);
    
    setItemsToReview(allDue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(allDue.length === 0);
    setMode('review');
  };

  const startReviewTopic = (topic) => {
    const topicItems = [...allData.vocabs, ...allData.grammars]
      .filter(item => item.topic && item.topic.trim() === topic)
      .sort(() => Math.random() - 0.5);
      
    setItemsToReview(topicItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(topicItems.length === 0);
    setMode('review');
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReview = async (remembered) => {
    const currentItem = itemsToReview[currentIndex];
    
    // Calculate new interval and next review date
    let newIntervalIndex = 0;
    if (remembered) {
      const currentIndexInArray = SRS_INTERVALS.indexOf(currentItem.interval || 1);
      newIntervalIndex = currentIndexInArray >= 0 ? currentIndexInArray + 1 : 1;
      if (newIntervalIndex >= SRS_INTERVALS.length) {
        newIntervalIndex = SRS_INTERVALS.length - 1; // max interval
      }
    } else {
      newIntervalIndex = 0;
    }
    
    const nextIntervalDays = SRS_INTERVALS[newIntervalIndex];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextIntervalDays);

    // Update in database
    try {
      await updateItem(currentItem.itemType, currentItem.id, {
        interval: nextIntervalDays,
        nextReviewDate: nextReviewDate.toISOString()
      });
    } catch (error) {
      console.error("Failed to update SRS data", error);
    }

    // Move to next card
    if (currentIndex + 1 < itemsToReview.length) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 300); // wait for flip animation before changing content
    } else {
      setIsFinished(true);
    }
  };

  if (loading) return <div className="text-center mt-8">カードを読み込み中...</div>;

  // SETUP MODE
  if (mode === 'setup') {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <h1 className="mb-6 text-3xl font-bold text-center">フラッシュカードの学習</h1>
        
        {/* Direction Switcher */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 p-1.5 rounded-2xl flex gap-2 border border-white/10 shadow-lg">
            <button 
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                direction === 'ja_to_vi' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setDirection('ja_to_vi')}
            >
              <span>🇯🇵 日本語</span> ➔ <span>🇻🇳 ベトナム語</span>
            </button>
            <button 
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                direction === 'vi_to_ja' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setDirection('vi_to_ja')}
            >
              <span>🇻🇳 ベトナム語</span> ➔ <span>🇯🇵 日本語</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Spaced Repetition Card */}
          <div className="glass-panel p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
              <Calendar className="text-primary w-8 h-8" />
            </div>
            <h2 className="text-2xl mb-4">定期復習</h2>
            <p className="text-muted mb-6 flex-1">
              忘却曲線に基づき、今日復習すべき単語と文法を学習します。
            </p>
            <div className="bg-white/5 w-full py-4 rounded-lg mb-8">
              <span className="text-3xl font-bold text-white">{dueCount}</span>
              <span className="text-muted ml-2">カード</span>
            </div>
            <button 
              className="btn btn-primary w-full py-4 text-lg"
              onClick={startReviewDue}
              disabled={dueCount === 0}
            >
              復習を開始
            </button>
          </div>

          {/* Topic Review Card */}
          <div className="glass-panel p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mb-6">
              <BookOpen className="text-pink-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl mb-4">トピック別の学習</h2>
            <p className="text-muted mb-6 flex-1">
              特定のトピック（テーマ）を選んで、そのトピックに含まれるすべてのカードを学習します。
            </p>
            
            <div className="w-full mb-8">
              {topics.length > 0 ? (
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {topics.map(topic => (
                    <button 
                      key={topic}
                      className="w-full text-left p-3 rounded bg-white/5 hover:bg-white/10 transition-colors flex justify-between items-center text-white"
                      onClick={() => startReviewTopic(topic)}
                    >
                      <span className="jp-text font-medium">{topic}</span>
                      <span className="text-xs px-2 py-1 rounded text-muted">
                        {[...allData.vocabs, ...allData.grammars].filter(i => i.topic === topic).length} カード
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 w-full py-4 rounded-lg">
                  <p className="text-muted text-sm">トピックがありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW FINISHED
  if (isFinished) {
    return (
      <div className="text-center mt-20 animate-fade-in">
        <h2 className="text-4xl mb-4">🎉 素晴らしい！</h2>
        <p className="text-xl text-muted mb-8">このセッションの復習カードをすべて完了しました。</p>
        
        <div className="flex gap-4 justify-center mt-4">
          <button className="btn btn-primary" onClick={() => setMode('setup')}>
            <ArrowLeft size={16} /> 選択に戻る
          </button>
        </div>
        
        <p className="text-gray-400 mt-8 mb-4">カードがありませんか？ 新しく追加しましょう：</p>
        <div className="flex gap-4 justify-center">
          <Link to="/vocab" className="btn btn-secondary">単語を追加</Link>
          <Link to="/grammar" className="btn btn-secondary">文法を追加</Link>
        </div>
      </div>
    );
  }

  const currentItem = itemsToReview[currentIndex];

  return (
    <div className="animate-fade-in flex flex-col items-center relative max-w-4xl mx-auto">
      {/* Action Header */}
      <div className="w-full flex justify-between items-center mb-6">
        <button className="btn btn-secondary text-sm" onClick={() => setMode('setup')}>
          <ArrowLeft size={16} /> 終了
        </button>

        <button 
          className="btn btn-secondary text-sm flex items-center gap-2"
          onClick={() => {
            setIsFlipped(false);
            setDirection(prev => prev === 'ja_to_vi' ? 'vi_to_ja' : 'ja_to_vi');
          }}
          title="学習方向を切り替える"
        >
          <ArrowRightLeft size={16} />
          {direction === 'ja_to_vi' ? '🇯🇵 ➔ 🇻🇳' : '🇻🇳 ➔ 🇯🇵'}
        </button>
      </div>
      
      <h1 className="mb-2 text-2xl">復習 ({currentIndex + 1} / {itemsToReview.length})</h1>
      <p className="mb-6 text-muted">
        {currentItem.itemType === 'vocab' ? '単語' : '文法'}
        {currentItem.topic && <span className="ml-2 bg-pink-500/20 text-pink-300 text-xs px-2 py-1 rounded">{currentItem.topic}</span>}
      </p>
      
      <div className="flashcard-container mb-8" onClick={handleFlip}>
        <div className={`flashcard glass-panel ${isFlipped ? 'flipped' : ''}`}>
          
          {/* FRONT OF CARD */}
          <div 
            className="flashcard-face flashcard-front" 
            style={{ opacity: isFlipped ? 0 : 1, transition: 'opacity 0.3s' }}
          >
            {direction === 'ja_to_vi' ? (
              // JA -> VI: Front shows Japanese
              <>
                {currentItem.itemType === 'vocab' ? (
                  <h2 className="word-large jp-text">{currentItem.word}</h2>
                ) : (
                  <h2 className="word-large jp-text" style={{ fontSize: '2.5rem' }}>{currentItem.title}</h2>
                )}
                <p className="text-muted mt-8 text-sm">タップして答えを見る</p>
              </>
            ) : (
              // VI -> JA: Front shows Vietnamese
              <>
                <p className="text-xs text-indigo-300 mb-2 uppercase tracking-wider font-semibold">ベトナム語の意味</p>
                <h2 className="text-3xl font-bold text-white mb-4" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {currentItem.meaning}
                </h2>
                {currentItem.itemType === 'vocab' && currentItem.type && (
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full mb-2">
                    品詞: {currentItem.type}
                  </span>
                )}
                <p className="text-muted mt-6 text-sm">タップして日本語を見る</p>
              </>
            )}
          </div>

          {/* BACK OF CARD */}
          <div 
            className="flashcard-face flashcard-back"
            style={{ opacity: isFlipped ? 1 : 0, transition: 'opacity 0.3s' }}
          >
            {direction === 'ja_to_vi' ? (
              // JA -> VI: Back shows Vietnamese meaning + details
              <>
                {currentItem.itemType === 'vocab' ? (
                  <>
                    <p className="reading jp-text" style={{ fontSize: '2rem' }}>{currentItem.reading}</p>
                    <p className="meaning mt-2 text-2xl text-white" style={{ whiteSpace: 'pre-wrap' }}>{currentItem.meaning}</p>
                    {currentItem.type && (
                      <span className="bg-indigo-500/20 text-indigo-300 text-sm px-3 py-1 rounded-full mt-4 block mx-auto w-max">
                        {currentItem.type}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <p className="reading jp-text font-mono text-sm mb-4" style={{ whiteSpace: 'pre-wrap' }}>{currentItem.structure}</p>
                    <p className="meaning mb-4 text-white" style={{ whiteSpace: 'pre-wrap' }}>{currentItem.meaning}</p>
                    {currentItem.example && (
                      <div className="mt-2 text-sm text-left w-full border-t border-white/10 pt-2">
                        <span className="text-xs text-indigo-300">例文: </span>
                        <span className="jp-text text-gray-300" style={{ whiteSpace: 'pre-wrap' }}>{currentItem.example}</span>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              // VI -> JA: Back shows Japanese word/title + reading + details
              <>
                {currentItem.itemType === 'vocab' ? (
                  <>
                    <h2 className="word-large jp-text text-primary">{currentItem.word}</h2>
                    <p className="reading jp-text mt-3" style={{ fontSize: '1.8rem', color: '#c7d2fe' }}>{currentItem.reading}</p>
                    {currentItem.type && (
                      <span className="bg-indigo-500/20 text-indigo-300 text-sm px-3 py-1 rounded-full mt-4 block mx-auto w-max">
                        {currentItem.type}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="word-large jp-text text-pink-400 mb-2" style={{ fontSize: '2.2rem' }}>{currentItem.title}</h2>
                    <p className="reading jp-text font-mono text-sm mb-4 bg-white/5 p-2 rounded w-full" style={{ whiteSpace: 'pre-wrap' }}>{currentItem.structure}</p>
                    {currentItem.example && (
                      <div className="mt-2 text-sm text-left w-full border-t border-white/10 pt-2">
                        <span className="text-xs text-indigo-300">例文: </span>
                        <span className="jp-text text-gray-300" style={{ whiteSpace: 'pre-wrap' }}>{currentItem.example}</span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-md animate-fade-in">
        <button className="btn btn-danger flex-1 py-4 text-lg" onClick={(e) => { e.stopPropagation(); handleReview(false); }}>
          覚えていない (忘れた)
        </button>
        <button className="btn btn-success flex-1 py-4 text-lg" onClick={(e) => { e.stopPropagation(); handleReview(true); }}>
          覚えた
        </button>
      </div>
    </div>
  );
};

export default FlashcardReview;
