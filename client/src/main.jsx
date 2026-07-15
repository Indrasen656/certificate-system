import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UIFeedbackProvider } from './components/UIFeedback.jsx';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UIFeedbackProvider>
      <App />
    </UIFeedbackProvider>
  </React.StrictMode>
);
