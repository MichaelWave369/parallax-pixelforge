import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const CARTRIDGE_TITLE = 'PixelForge Starter Cartridge';

const scenes = {
  start: {
    title: 'A Tiny Room',
    body: 'You wake up beside a glowing cartridge. It hums like it remembers a better timeline.',
    hint: 'Your first scene only needs one clear thing to notice and one clear thing to do.',
    actions: [
      { label: 'Pick up the cartridge', next: 'cartridge' },
      { label: 'Look around the room', next: 'room' }
    ]
  },
  room: {
    title: 'The Room Smiles Back',
    body: 'There is one door, one lamp, and one note that says: finish small, then make another.',
    hint: 'A second choice is enough to create curiosity. You do not need a giant branching tree.',
    actions: [
      { label: 'Read the note again', next: 'room' },
      { label: 'Pick up the cartridge', next: 'cartridge' }
    ]
  },
  cartridge: {
    title: 'Starter Loop Complete',
    body: 'The cartridge clicks into place. This is enough for a first game: one room, one choice, one feeling, one ending.',
    hint: 'Now replace this tiny loop with your own idea. Keep the first playable version this small.',
    actions: [
      { label: 'Restart the tiny loop', next: 'start' }
    ]
  }
};

function ProgressDots({ activeId }) {
  const ids = Object.keys(scenes);
  return (
    <div className="progress" aria-label="Cartridge progress">
      {ids.map((id, index) => (
        <span key={id} className={id === activeId ? 'dot active' : 'dot'} aria-hidden="true" title={`Scene ${index + 1}`} />
      ))}
    </div>
  );
}

function ActionButton({ action, onChoose }) {
  return (
    <button className="action-button" onClick={() => onChoose(action.next)}>
      <span>{action.label}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

function CreatorTip({ children }) {
  return (
    <aside className="creator-tip">
      <img src="/starter-assets/spark.svg" alt="" aria-hidden="true" />
      <div>
        <strong>Creator tip</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}

function App() {
  const [sceneId, setSceneId] = useState('start');
  const scene = scenes[sceneId];
  const captureMode = useMemo(() => new URLSearchParams(window.location.search).get('capture') === '1', []);

  return (
    <main className={captureMode ? 'screen capture-mode' : 'screen'}>
      <section className="cartridge-shell" aria-live="polite">
        <header className="cartridge-header">
          <div className="brand-line">
            <img src="/starter-assets/cartridge.svg" alt="" aria-hidden="true" />
            <div>
              <p className="eyebrow">PixelForge cartridge</p>
              <p className="game-title">{CARTRIDGE_TITLE}</p>
            </div>
          </div>
          <ProgressDots activeId={sceneId} />
        </header>

        <article className="story-card">
          <p className="scene-label">Playable scene</p>
          <h1>{scene.title}</h1>
          <p className="story-copy">{scene.body}</p>
          <div className="actions">
            {scene.actions.map((action) => (
              <ActionButton key={action.label} action={action} onChoose={setSceneId} />
            ))}
          </div>
        </article>

        {!captureMode && <CreatorTip>{scene.hint}</CreatorTip>}

        <footer className="cartridge-footer">
          <span>1 room</span><span>1 mechanic</span><span>1 feeling</span><span>1 ending</span>
        </footer>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
