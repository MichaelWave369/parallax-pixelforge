import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { scenes } from './cartridge.js';

function App() {
  const [sceneId, setSceneId] = useState('start');
  const scene = scenes[sceneId];
  return (
    <main className="screen">
      <section className="card">
        <p className="eyebrow">PixelForge Starter Cartridge</p>
        <h1>{scene.title}</h1>
        <p>{scene.body}</p>
        <div className="actions">
          {scene.actions.map((action) => (
            <button key={action.label} onClick={() => setSceneId(action.next)}>{action.label}</button>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
