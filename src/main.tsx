import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/400-italic.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import App from './App.tsx';
import './index.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
