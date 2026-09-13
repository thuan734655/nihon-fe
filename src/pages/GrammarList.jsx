import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getItems, addItem, updateItem, deleteItem } from '../services/api';
import { Plus, Edit2, Trash2, Eye, EyeOff, X } from 'lucide-react';

const GrammarList = () => {
  const location = useLocation();
  const [grammars, setGrammars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, title: '', structure: '', meaning: '', example: '', topic: '', usage: '' });

  const [selectedIds, setSelectedIds] = useState([]);

  const fetchGrammars = async () => {
    setLoading(true);
    try {
      const data = await getItems('grammar');
      // Sort explicitly by ID descending using standard string comparison
      const sortedData = data ? [...data].sort((a, b) => (a.id < b.id ? 1 : -1)) : [];
      setGrammars(sortedData);
      setSelectedIds([]);
    } catch (e) {
      console.error("Error fetching grammars:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrammars();
  }, [location.pathname]);

  const handleOpenModal = (grammar = null) => {
    if (grammar) {
      setFormData(grammar);
    } else {
      setFormData({ id: null, title: '', structure: '', meaning: '', example: '', topic: '', usage: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        structure: formData.structure,
        meaning: formData.meaning,
        example: formData.example,
        topic: formData.topic,
        usage: formData.usage
      };
      if (formData.id) {
        await updateItem('grammar', formData.id, payload);
      } else {
        await addItem('grammar', payload);
        setCurrentPage(1); // Jump to first page to see the newly added item
      }
      setIsModalOpen(false);
      fetchGrammars();
    } catch (e) {
      console.error("Error saving grammar:", e);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("この文法を削除してもよろしいですか？")) {
      try {
        await deleteItem('grammar', id);
        fetchGrammars();
      } catch (e) {
        console.error("Error deleting grammar:", e);
      }
    }
  };

  const handleToggleReview = async (grammar) => {
    try {
      const newStatus = grammar.inReviewCycle === false ? true : false;
      await updateItem('grammar', grammar.id, { inReviewCycle: newStatus });
      fetchGrammars();
    } catch (e) {
      console.error("Error toggling review status:", e);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const totalPages = Math.ceil(grammars.length / itemsPerPage);
  const currentGrammars = grammars.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = () => {
    const currentPageIds = currentGrammars.map(g => g.id);
    const allSelectedOnPage = currentPageIds.every(id => selectedIds.includes(id));
    
    if (allSelectedOnPage) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const handleExportSelected = () => {
    const selectedItems = grammars
      .filter(g => selectedIds.includes(g.id))
      .map(g => ({
        title: g.title,
        structure: g.structure,
        meaning: g.meaning
      }));
    const dataStr = JSON.stringify(selectedItems, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grammar_export_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Only grammar topics (separated)
  const existingTopics = Array.from(
    new Set(grammars.map(g => g.topic && typeof g.topic === 'string' ? g.topic.trim() : '').filter(Boolean))
  ).sort();

  const isAllCurrentPageSelected = currentGrammars.length > 0 && currentGrammars.every(g => selectedIds.includes(g.id));

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="mb-0">文法の管理</h1>
          {currentGrammars.length > 0 && (
            <button 
              className="btn btn-secondary text-sm" 
              onClick={handleSelectAll}
            >
              {isAllCurrentPageSelected ? 'このページを選択解除' : 'このページをすべて選択'}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button className="btn bg-green-600 hover:bg-green-700 text-white" onClick={handleExportSelected}>
              JSON出力 ({selectedIds.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} /> 新しく追加
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="data-grid">
            {currentGrammars.map(grammar => (
              <div key={grammar.id} className={`glass-panel item-card ${selectedIds.includes(grammar.id) ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-primary cursor-pointer" 
                      checked={selectedIds.includes(grammar.id)}
                      onChange={() => handleToggleSelect(grammar.id)}
                    />
                    <h3 className="jp-text text-xl text-pink-400 m-0">{grammar.title}</h3>
                  </div>
                  {grammar.topic && <span className="bg-pink-500/20 text-pink-300 text-xs px-2 py-1 rounded">{grammar.topic}</span>}
                </div>
                <p className="jp-text text-muted font-mono bg-black/20 p-2 rounded mt-2" style={{ whiteSpace: 'pre-wrap' }}>{grammar.structure}</p>
                <p className="mt-2 text-white" style={{ whiteSpace: 'pre-wrap' }}>{grammar.meaning}</p>
                {grammar.usage && (
                  <div className="mt-2 text-sm text-gray-400 border-l-2 border-gray-600 pl-2" style={{ whiteSpace: 'pre-wrap' }}>
                    <span className="block text-xs mb-1">使い方:</span>
                    {grammar.usage}
                  </div>
                )}
                {grammar.example && (
                  <div className="mt-4 p-3 border-l-2 border-primary bg-white/5 rounded-r">
                    <span className="text-xs text-muted block mb-1">例文:</span>
                    <p className="jp-text" style={{ whiteSpace: 'pre-wrap' }}>{grammar.example}</p>
                  </div>
                )}
                
                <div className="item-actions mt-auto pt-4">
                  <button 
                    className={`btn flex-1 ${grammar.inReviewCycle === false ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggleReview(grammar)}
                    title={grammar.inReviewCycle === false ? '復習オフ' : '復習オン'}
                  >
                    {grammar.inReviewCycle === false ? <EyeOff size={16} /> : <Eye size={16} />} 
                    {grammar.inReviewCycle === false ? 'オフ' : 'オン'}
                  </button>
                  <button className="btn btn-secondary flex-1" onClick={() => handleOpenModal(grammar)}>
                    <Edit2 size={16} /> 編集
                  </button>
                  <button className="btn btn-danger flex-1" onClick={() => handleDelete(grammar.id)}>
                    <Trash2 size={16} /> 削除
                  </button>
                </div>
              </div>
            ))}
            {currentGrammars.length === 0 && <p className="text-muted">文法がありません。</p>}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                前へ
              </button>
              <span className="flex items-center px-4">
                {currentPage} / {totalPages}
              </span>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2>{formData.id ? '文法を編集' : '新しく追加'}</h2>
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
                <label>文法名</label>
                <input 
                  type="text" 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="例文: ～てはいけない"
                />
              </div>
              <div className="input-group">
                <label>トピック (既存の選択または直接入力)</label>
                <input 
                  type="text" 
                  list="grammar-topic-list"
                  value={formData.topic || ''} 
                  onChange={e => setFormData({...formData, topic: e.target.value})} 
                  placeholder="例: N3, N2..."
                />
                <datalist id="grammar-topic-list">
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
              <div className="input-group">
                <label>接続 (Structure)</label>
                <textarea 
                  rows={2}
                  required 
                  value={formData.structure} 
                  onChange={e => setFormData({...formData, structure: e.target.value})} 
                  placeholder="例文: Vて + はいけない"
                />
              </div>
              <div className="input-group">
                <label>意味 (ベトナム語)</label>
                <textarea 
                  rows={2}
                  required 
                  value={formData.meaning} 
                  onChange={e => setFormData({...formData, meaning: e.target.value})} 
                  placeholder="例文: Không được làm gì đó"
                />
              </div>
              <div className="input-group">
                <label>使い方 (ニュアンス / 注意点)</label>
                <textarea 
                  rows={2}
                  value={formData.usage || ''} 
                  onChange={e => setFormData({...formData, usage: e.target.value})} 
                  placeholder="例文: Dùng khi cấm đoán mạnh mẽ..."
                />
              </div>
              <div className="input-group">
                <label>質問 ví dụ (Tùy chọn)</label>
                <textarea 
                  rows={3}
                  value={formData.example} 
                  onChange={e => setFormData({...formData, example: e.target.value})} 
                  placeholder="例文: ここで写真を撮ってはいけません。"
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

export default GrammarList;
