import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getItems, addItem, updateItem, deleteItem } from '../services/api';
import { Plus, Edit2, Trash2, Eye, EyeOff, X } from 'lucide-react';

const VocabList = () => {
  const location = useLocation();
  const [vocabs, setVocabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, word: '', reading: '', meaning: '', type: '名詞', topic: '' });

  const fetchVocabs = async () => {
    setLoading(true);
    try {
      const data = await getItems('vocab');
      setVocabs(data || []);
    } catch (e) {
      console.error("Error fetching vocabs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVocabs();
  }, [location.pathname]);

  const handleOpenModal = (vocab = null) => {
    if (vocab) {
      setFormData(vocab);
    } else {
      setFormData({ id: null, word: '', reading: '', meaning: '', type: '名詞', topic: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await updateItem('vocab', formData.id, {
          word: formData.word,
          reading: formData.reading,
          meaning: formData.meaning,
          type: formData.type,
          topic: formData.topic
        });
      } else {
        await addItem('vocab', {
          word: formData.word,
          reading: formData.reading,
          meaning: formData.meaning,
          type: formData.type,
          topic: formData.topic
        });
      }
      setIsModalOpen(false);
      fetchVocabs();
    } catch (e) {
      console.error("Error saving vocab:", e);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("この単語を削除してもよろしいですか？")) {
      try {
        await deleteItem('vocab', id);
        fetchVocabs();
      } catch (e) {
        console.error("Error deleting vocab:", e);
      }
    }
  };

  const handleToggleReview = async (vocab) => {
    try {
      const newStatus = vocab.inReviewCycle === false ? true : false;
      await updateItem('vocab', vocab.id, { inReviewCycle: newStatus });
      fetchVocabs();
    } catch (e) {
      console.error("Error toggling review status:", e);
    }
  };

  // Only vocab topics (separated)
  const existingTopics = Array.from(
    new Set(vocabs.map(v => v.topic && typeof v.topic === 'string' ? v.topic.trim() : '').filter(Boolean))
  ).sort();

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1>単語の管理</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} /> 新しく追加
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="data-grid">
          {vocabs.map(vocab => (
            <div key={vocab.id} className="glass-panel item-card">
              <div className="flex justify-between items-start">
                <h3 className="jp-text text-2xl text-primary">{vocab.word}</h3>
                <div className="flex gap-2">
                  {vocab.type && <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-1 rounded">{vocab.type}</span>}
                  {vocab.topic && <span className="bg-pink-500/20 text-pink-300 text-xs px-2 py-1 rounded">{vocab.topic}</span>}
                </div>
              </div>
              <p className="jp-text text-muted">{vocab.reading}</p>
              <p className="mt-4" style={{ whiteSpace: 'pre-wrap' }}>{vocab.meaning}</p>
              
              <div className="item-actions mt-auto">
                <button 
                  className={`btn flex-1 ${vocab.inReviewCycle === false ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => handleToggleReview(vocab)}
                  title={vocab.inReviewCycle === false ? '復習オフ' : '復習オン'}
                >
                  {vocab.inReviewCycle === false ? <EyeOff size={16} /> : <Eye size={16} />} 
                  {vocab.inReviewCycle === false ? 'オフ' : 'オン'}
                </button>
                <button className="btn btn-secondary flex-1" onClick={() => handleOpenModal(vocab)}>
                  <Edit2 size={16} /> 編集
                </button>
                <button className="btn btn-danger flex-1" onClick={() => handleDelete(vocab.id)}>
                  <Trash2 size={16} /> 削除
                </button>
              </div>
            </div>
          ))}
          {vocabs.length === 0 && <p className="text-muted">単語がありません。</p>}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2>{formData.id ? '単語を編集' : '新しい単語を追加'}</h2>
              <button 
                type="button" 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setIsModalOpen(false)}
                title="閉じる"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>単語 (Kanji / Hiragana)</label>
                <input 
                  type="text" 
                  required 
                  value={formData.word} 
                  onChange={e => setFormData({...formData, word: e.target.value})} 
                  placeholder="例文: 食べる"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label>品詞</label>
                  <select 
                    value={formData.type || '名詞'} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="名詞">名詞</option>
                    <option value="動詞">動詞</option>
                    <option value="い形容詞">い形容詞</option>
                    <option value="な形容詞">な形容詞</option>
                    <option value="副詞">副詞</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>トピック (既存の選択または直接入力)</label>
                  <input 
                    type="text" 
                    list="vocab-topic-list"
                    value={formData.topic || ''} 
                    onChange={e => setFormData({...formData, topic: e.target.value})} 
                    placeholder="例: IT, N3..."
                  />
                  <datalist id="vocab-topic-list">
                    {existingTopics.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  {existingTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto pr-1">
                      {existingTopics.map(t => (
                        <span 
                          key={t}
                          className={`topic-chip ${formData.topic === t ? 'active' : ''}`}
                          onClick={() => setFormData({...formData, topic: formData.topic === t ? '' : t})}
                          title={formData.topic === t ? 'クリックして解除' : 'クリックして選択'}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="input-group">
                <label>読み方 (ふりがな / ローマ字)</label>
                <input 
                  type="text" 
                  required 
                  value={formData.reading} 
                  onChange={e => setFormData({...formData, reading: e.target.value})} 
                  placeholder="例: たべる"
                />
              </div>
              <div className="input-group">
                <label>意味 (ベトナム語)</label>
                <textarea 
                  rows={3}
                  required 
                  value={formData.meaning} 
                  onChange={e => setFormData({...formData, meaning: e.target.value})} 
                  placeholder="例: Ăn uống, dùng bữa..."
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button type="submit" className="btn btn-primary flex-1">保存</button>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabList;
