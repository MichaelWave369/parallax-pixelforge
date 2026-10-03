export const cartridge = {
  projectId: 'pixelforge-starter-cartridge',
  title: 'PixelForge Starter Cartridge',
  pitch: 'A tiny choice-driven cartridge about learning to finish small things.',
  creator: { creatorId: 'parallax-pixelforge-team', displayName: 'Parallax PixelForge' },
  publicPlayUrl: null,
  runInstructions: 'cd games/starter && npm install && npm run dev',
  loop: {
    room: 'A Tiny Room',
    mechanic: 'Choose one of a few actions to move between scenes.',
    feeling: 'Gentle encouragement and playful retro wonder.',
    ending: 'You made something small enough to finish. That counts.'
  },
  world: { setting: 'A tiny retro room containing a mysterious glowing cartridge.' },
  characters: [],
  assets: [],
  creatorIntent: {
    themes: ['finish small things', 'creative courage'],
    mustPreserve: ['The adaptation must preserve the gentle message that finishing something small counts.'],
    prohibitedChanges: ['Do not turn the story into a violent conflict.'],
    adaptationPreferences: ['warm', 'retro-futurist', 'hopeful']
  },
  canon: [{
    id: 'starter-core-message',
    text: 'Finishing something small counts.',
    rigidity: 'HARD',
    sourceIds: ['games/starter/src/cartridge.js'],
    assertion: { key: 'coreMessage', value: 'Finishing something small counts.' }
  }],
  scenes: {
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
      actions: [{ label: 'Play again', next: 'start' }]
    }
  }
};

export const scenes = cartridge.scenes;
