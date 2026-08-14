import React, { useState, useEffect } from 'react';
import { getItems } from '../services/api';

const Quiz = () => {
  const [vocabs, setVocabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const fetchVocabs = async () => {
      try {
        const data = await getItems('vocab');
        setVocabs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchVocabs();
  }, []);

  const generateQuiz = () => {
    if (vocabs.length < 4) {
      alert("クイズを始めるには、少なくとも4つの単語が必要です。");
      return;
    }
    
    // Shuffle and pick 10 questions (or all if < 10)
    const shuffled = [...vocabs].sort(() => 0.5 - Math.random());
    const selectedVocabs = shuffled.slice(0, Math.min(10, shuffled.length));

    const generatedQuestions = selectedVocabs.map(vocab => {
      const isJpToVi = Math.random() > 0.5;
      
      // Get 3 wrong answers
      const wrongAnswers = shuffled
        .filter(v => v.id !== vocab.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
        
      const options = [vocab, ...wrongAnswers].map(v => 
        isJpToVi ? v.meaning : v.word
      ).sort(() => 0.5 - Math.random());

      return {
        question: isJpToVi ? `の意味は "${vocab.word}" 何ですか？` : `単語 tiếng Nhật của "${vocab.meaning}" 何ですか？`,
        options,
        answer: isJpToVi ? vocab.meaning : vocab.word,
        vocabWord: vocab.word
      };
    });

    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsStarted(true);
  };

  const handleSelectAnswer = (option) => {
    if (selectedAnswer !== null) return; // Prevent double clicking
    
    setSelectedAnswer(option);
    
    const isCorrect = option === questions[currentQuestionIndex].answer;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setIsFinished(true);
      }
    }, 1500); // Wait 1.5s to show correct/incorrect color
  };

  if (loading) return <div className="text-center mt-4">Loading...</div>;

  if (!isStarted) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="mb-4 text-4xl">クイズ</h1>
        <p className="mb-8 text-muted text-center max-w-md">Kiểm tra kiến thức của bạn bằng các câu hỏi ngẫu nhiên từ danh sách từ vựng.</p>
        <button className="btn btn-primary text-xl px-8 py-4" onClick={generateQuiz}>
          今すぐ始める
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="mb-4 text-4xl">結果</h1>
        <div className="text-6xl font-bold mb-8 text-primary">
          {score} <span className="text-3xl text-muted">/ {questions.length}</span>
        </div>
        <p className="mb-8 text-xl">
          {score === questions.length ? '素晴らしい！全問正解です。' : 
           score > questions.length / 2 ? 'よくできました、その調子で頑張りましょう！' : 'もう少し復習しましょう。'}
        </p>
        <button className="btn btn-primary" onClick={generateQuiz}>
          もう一度プレイ
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="animate-fade-in max-w-2xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-muted">質問 {currentQuestionIndex + 1} / {questions.length}</h2>
        <div className="text-primary font-bold">スコア: {score}</div>
      </div>
      
      <div className="glass-panel p-8 mb-8 text-center min-h-[200px] flex items-center justify-center">
        <h2 className="text-3xl jp-text leading-relaxed">{currentQ.question}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQ.options.map((option, idx) => {
          let btnClass = "glass-panel p-4 text-xl jp-text transition-all hover:bg-white/10 text-left";
          
          if (selectedAnswer !== null) {
            if (option === currentQ.answer) {
              btnClass = "glass-panel p-4 text-xl jp-text transition-all bg-green-500/20 border-green-500 text-left"; // correct
            } else if (option === selectedAnswer) {
              btnClass = "glass-panel p-4 text-xl jp-text transition-all bg-red-500/20 border-red-500 text-left"; // wrong selected
            }
          }

          return (
            <button 
              key={idx} 
              className={btnClass}
              onClick={() => handleSelectAnswer(option)}
              disabled={selectedAnswer !== null}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Quiz;
