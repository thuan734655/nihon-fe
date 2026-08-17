import axios from 'axios';

// Automatically detect environment or use the provided Render backend endpoint
const API_URL = import.meta.env.VITE_API_URL || 'https://nihon-be-q5a3.onrender.com/api';

export const getItems = async (type) => {
  const res = await axios.get(`${API_URL}/items/${type}`);
  return res.data;
};

export const addItem = async (type, data) => {
  const res = await axios.post(`${API_URL}/items/${type}`, data);
  return res.data;
};

export const updateItem = async (type, id, data) => {
  const res = await axios.put(`${API_URL}/items/${type}/${id}`, data);
  return res.data;
};

export const deleteItem = async (type, id) => {
  const res = await axios.delete(`${API_URL}/items/${type}/${id}`);
  return res.data;
};

export const checkTranslations = async (translations) => {
  const response = await axios.post(`${API_URL}/ai/check-translations`, { translations });
  return response.data;
};

export const generateSentences = async (payload) => {
  const response = await axios.post(`${API_URL}/ai/generate-sentences`, payload);
  return response.data;
};
