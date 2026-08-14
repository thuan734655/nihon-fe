import React, { useEffect, useState } from 'react';
import { getItems } from '../services/api';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Book, Type } from 'lucide-react';

const Dashboard = () => {
  const location = useLocation();
  const [stats, setStats] = useState({ vocab: 0, grammar: 0, reviewVocab: 0, reviewGrammar: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const vocabs = await getItems('vocab');
      const grammars = await getItems('grammar');
      
      const now = new Date();
      const dueVocabs = vocabs.filter(v => v.inReviewCycle !== false && new Date(v.nextReviewDate) <= now);
      const dueGrammars = grammars.filter(g => g.inReviewCycle !== false && new Date(g.nextReviewDate) <= now);

      setStats({
        vocab: vocabs.length,
        grammar: grammars.length,
        reviewVocab: dueVocabs.length,
        reviewGrammar: dueGrammars.length
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [location.pathname]);

  if (loading) return <div className="text-center mt-4">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="mb-8">Dashboard</h1>
      
      <div className="data-grid mb-8">
        <div className="glass-panel item-card text-center">
          <Book size={48} className="mx-auto text-indigo-400 mb-4" />
          <h2 className="mb-4 text-3xl">{stats.vocab}</h2>
          <p className="text-muted">単語の総数</p>
        </div>
        
        <div className="glass-panel item-card text-center">
          <Type size={48} className="mx-auto text-pink-400 mb-4" />
          <h2 className="mb-4 text-3xl">{stats.grammar}</h2>
          <p className="text-muted">文法の総数</p>
        </div>

        <div className="glass-panel item-card text-center" style={{ border: '1px solid var(--warning)' }}>
          <Brain size={48} className="mx-auto text-yellow-400 mb-4" />
          <h2 className="mb-4 text-3xl text-yellow-400">{stats.reviewVocab + stats.reviewGrammar}</h2>
          <p className="text-muted">今日の復習</p>
          <Link to="/review" className="btn btn-primary mt-4 w-full">復習を始める</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
