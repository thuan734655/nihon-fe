import React from 'react';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import { Book, CheckSquare, Brain, LayoutDashboard, Settings, Type } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import VocabList from './pages/VocabList';
import GrammarList from './pages/GrammarList';
import FlashcardReview from './pages/FlashcardReview';
import Quiz from './pages/Quiz';
import Translation from './pages/Translation';

const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/vocab', label: '単語', icon: Book },
    { path: '/grammar', label: '文法', icon: Type },
    { path: '/review', label: '復習 (フラッシュカード)', icon: Brain },
    { path: '/quiz', label: 'クイズ', icon: CheckSquare },
    { path: '/translate', label: '翻訳 & AI', icon: Settings }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span role="img" aria-label="japan">🇯🇵</span> Nihongo App
      </div>
      <nav>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const AppLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: currentPath === '/' ? 'block' : 'none' }}>
          <Dashboard />
        </div>
        <div style={{ display: currentPath === '/vocab' ? 'block' : 'none' }}>
          <VocabList />
        </div>
        <div style={{ display: currentPath === '/grammar' ? 'block' : 'none' }}>
          <GrammarList />
        </div>
        <div style={{ display: currentPath === '/review' ? 'block' : 'none' }}>
          <FlashcardReview />
        </div>
        <div style={{ display: currentPath === '/quiz' ? 'block' : 'none' }}>
          <Quiz />
        </div>
        <div style={{ display: currentPath === '/translate' ? 'block' : 'none' }}>
          <Translation />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
