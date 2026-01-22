import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("INDEX.TSX EXECUTING");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
console.log('Mounting App...');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('App mount called');
