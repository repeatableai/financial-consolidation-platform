import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';
import './axiosConfig'; // Configure axios with base URL

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
