import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const scenes = {
  start: {
    title: 'A Tiny Room',
    body: 'You wake up beside a glowing cartridge. It hums like it remembers a better timeline.',
    actions: [
      { label: 'Pick up the cartridge', next: 'cartridge' },
      { label: 'Look around', next: 'room' }
    ]
  },
  room: {
    title: 'The Room Smiles Back',
    body: 'There is one door, one lamp, and one note that says: finish small things.',
    actions: [
      { label: 'Read the note again', next: 'room' },
      { label: 'Open the door', next: 'ending' }
    ]
  },
  cartridge: {
    title: 'Pocket Spark',
    body: 'The cartridge says: one room, one mechanic, one feeling, one ending.',
    actions: [
      { label: 'Carry it forward', next: 'ending' },
      { label: 'Set it down gently', next: 'start' }
    ]
  },
  ending: {
    title: 'A Tiny Ending',
    body: 'You made something small enough to finish. That counts.',
    actions: [
      { label: 'Play again', next: 'start' }
    ]
  }
};

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
