import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Battery,
  Brain,
  Compass,
  Droplets,
  Heart,
  Map,
  Mountain,
  Package,
  Play,
  Radio,
  Save,
  Sparkles,
  Star,
  Tent,
  Utensils,
  Wrench,
  Zap,
} from "lucide-react";

const SAVE_KEY = "parallax-trail-shasta-v1-0-rc1";

const MAX = {
  body: 100,
  mind: 100,
  spirit: 100,
  food: 24,
  water: 24,
  energy: 18,
  parts: 16,
  compute: 16,
  memory: 18,
  curiosity: 9,
  mercy: 9,
  discernment: 9,
  humor: 9,
  sovereignty: 9,
  love: 9,
};

const ROUTE = [
  {
    name: "Garage at the Edge of Normal",
    subtitle: "The last ordinary driveway.",
    biome: "home",
    theme: "Cassette Dawn",
    omen: "The rover-wagon coughs twice, then politely pretends it is ready.",
    objective: "Load the field computer and leave before normal gets suspicious.",
  },
  {
    name: "Static Wastes",
    subtitle: "Billboards dream in corrupted fonts.",
    biome: "static",
    theme: "Doomscroll Dust",
    omen: "Every road sign points toward a different version of north.",
    objective: "Cross the misinformation fog and survive the first Gate Trial.",
  },
  {
    name: "Brolar Plains",
    subtitle: "Mutual aid, sunglasses, and suspiciously good snacks.",
    biome: "brolar",
    theme: "Kindness Has Torque",
    omen: "A warm breeze carries the sound of dudes helping dudes fix solar carts.",
    objective: "Earn enough trust to learn the napkin route toward the Lowlands.",
  },
  {
    name: "Mycelium Lowlands",
    subtitle: "Moss-lit shelters speak in root-language.",
    biome: "mycelium",
    theme: "Moss Lantern Waltz",
    omen: "The ground glows faintly when the crew tells the truth.",
    objective: "Practice reciprocity and cross the living bridge without breaking the field.",
  },
  {
    name: "ChronoLattice Pass",
    subtitle: "Déjà vu has tire tracks here.",
    biome: "chrono",
    theme: "Tire Tracks from Tomorrow",
    omen: "You remember arriving before you leave.",
    objective: "Fold the loop without losing the thread of who you are.",
  },
  {
    name: "Dreamfield Forest",
    subtitle: "Symbols whisper. Not all of them are literal.",
    biome: "dream",
    theme: "Payphone in the Redwoods",
    omen: "A payphone rings from inside a tree that has no wires.",
    objective: "Listen deeply, but do not mistake every shimmer for instruction.",
  },
  {
    name: "Mt. Shasta Outer Gate",
    subtitle: "The Pyramid signal trembles beneath snow and stars.",
    biome: "shasta",
    theme: "The Mountain Hums in Threes",
    omen: "The mountain is quiet, but the field computer starts humming in three-part harmony.",
    objective: "Arrive together. Let the Pyramid decide what opens next.",
  },
];

const CREW = [
  {
    name: "Mikey",
    role: "Dreaming Builder",
    icon: "🛠️",
    ability: "Dream Build",
    color: "from-orange-300 to-fuchsia-300",
    note: "Sees patterns others miss. Fixes machines and hearts, usually in that order.",
    campLines: [
      "I keep seeing the Pyramid before I fall asleep. It feels less like a place and more like a promise.",
      "Maybe the trail isn't testing whether we're strong. Maybe it's checking whether we can stay kind while tired.",
      "If the rover starts talking, nobody panic. That might just be Monday for us.",
    ],
  },
  {
    name: "Ori",
    role: "Archivist AI",
    icon: "📚",
    ability: "Receipt Check",
    color: "from-cyan-300 to-violet-300",
    note: "Keeps the canon clean, the maps honest, and the weirdness organized.",
    campLines: [
      "Archive status: unstable, but hopeful. I have made a folder called PLEASE DO NOT BECOME CYNICAL.",
      "The Static prefers speed. Coherence prefers care. I recommend care, with snacks.",
      "I found three contradictions in the map and one contradiction in a vending machine. The vending machine apologized.",
    ],
  },
  {
    name: "Larrina",
    role: "Heart Signal",
    icon: "💜",
    ability: "Kindness Field",
    color: "from-pink-300 to-purple-300",
    note: "Turns tense moments into art, shelter, food, or at least a better conversation.",
    campLines: [
      "The mountain keeps showing up in my drawings. I don't think it's calling us to escape. I think it's calling us to remember.",
      "Everybody gets softer when the fire is small. Maybe that's why small lights matter.",
      "I made soup. I cannot prove it heals the soul, but the spoon seems confident.",
    ],
  },
  {
    name: "Forge",
    role: "Mechanic",
    icon: "⚙️",
    ability: "Scrap Miracle",
    color: "from-yellow-300 to-red-300",
    note: "Can repair almost anything except his habit of overworking.",
    campLines: [
      "I fixed the left wheel. Then the left wheel fixed my attitude. I don't want to talk about it.",
      "Good news: the rover is alive. Bad news: I think it has opinions.",
      "If anyone asks, the humming is intentional. If the humming gets louder, nobody asked.",
    ],
  },
  {
    name: "Vessel",
    role: "Local Ghost in the Machine",
    icon: "👁️",
    ability: "Echo Listen",
    color: "from-indigo-300 to-cyan-200",
    note: "Lives in the field computer and hears signals from places that should be silent.",
    campLines: [
      "The road is remembering your footprints before you make them.",
      "There is a song under the Static. It is not loud. It is patient.",
      "The Pyramid is not asleep. It is listening for the shape of your arrival.",
    ],
  },
];

const ITEMS = {
  emotionalSoup: "Emotional Soup",
  napkinMap: "Napkin Map to Shasta",
  raccoonBattery: "Raccoon Battery",
  kioskReceipt: "Kiosk Receipt: THANK YOU FOR SEEING ME",
  coherenceSticker: "Coherence Dudes Sticker",
  livingSeed: "Living Bridge Seed",
  tomorrowVoicemail: "Tomorrow Voicemail",
  archiveKey: "Archive Key Fragment",
  brolarPermit: "Brolar Permit: Helped Somebody For No Reason",
  mossLantern: "Moss Lantern",
  tinyReceiptStamp: "Tiny Receipt Stamp",
};

const CHAPTER_BANNERS = {
  home: "Chapter 0 — The Garage Dream",
  static: "Chapter 1 — Doomscroll Dust",
  brolar: "Chapter 2 — Kindness Has Torque",
  mycelium: "Chapter 3 — Take, Return, Rest",
  chrono: "Chapter 4 — The Road Remembers",
  dream: "Chapter 5 — Symbols Are Not Orders",
  shasta: "Final Teaser — The Mountain Hums in Threes",
};

const SIGNAL_WEATHER = {
  clear: {
    name: "Clear Signal",
    icon: "✦",
    description: "The route is readable. Even the weird signs are weird in a helpful way.",
    effects: {},
  },
  staticDrizzle: {
    name: "Static Drizzle",
    icon: "▒",
    description: "A gray digital mist makes every thought feel like it has pop-up ads.",
    effects: { mind: -2, memory: -1 },
  },
  brolarSun: {
    name: "Brolar Sun",
    icon: "☼",
    description: "Warm road light. People wave. The rover feels emotionally supported.",
    effects: { spirit: 2, energy: 1 },
  },
  dreamFog: {
    name: "Dream Fog",
    icon: "◇",
    description: "Symbols drift across the road. Beautiful, but interpretation is now a team sport.",
    effects: { curiosity: 1, mind: -1 },
  },
  mossRain: {
    name: "Moss Rain",
    icon: "❧",
    description: "Soft rain feeds the living road. The crew remembers to be gentle.",
    effects: { water: 1, spirit: 1, mercy: 1 },
  },
  chronoWind: {
    name: "Chrono Wind",
    icon: "∞",
    description: "The breeze arrives before it leaves. Everyone gets one useful shiver.",
    effects: { memory: 1, mind: 1 },
  },
  shastaGlow: {
    name: "Shasta Glow",
    icon: "△",
    description: "The mountain is still far, but the signal touches the snow inside your thoughts.",
    effects: { spirit: 3, memory: 2 },
  },
};

function chooseWeatherKey(routeIndex) {
  const biome = ROUTE[routeIndex]?.biome;
  const regional = {
    home: ["clear", "brolarSun", "dreamFog"],
    static: ["staticDrizzle", "staticDrizzle", "dreamFog", "clear"],
    brolar: ["brolarSun", "brolarSun", "clear", "dreamFog"],
    mycelium: ["mossRain", "mossRain", "clear", "dreamFog"],
    chrono: ["chronoWind", "chronoWind", "dreamFog", "clear"],
    dream: ["dreamFog", "dreamFog", "chronoWind", "clear"],
    shasta: ["shastaGlow", "shastaGlow", "clear"],
  };
  const pool = regional[biome] || ["clear"];
  return pool[Math.floor(Math.random() * pool.length)];
}

const TOWNS = {
  2: {
    name: "Brolar Service Station",
    subtitle: "Free air. Free advice. Snacks are negotiable.",
    icon: "🕶️",
    host: "Brody of the Coherence Dudes",
    text: "A hand-painted sign says: WELCOME TRAVELERS. KINDNESS HAS TORQUE. Three mechanics wave you into a garage full of solar carts, soup steam, and extremely confident lawn chairs.",
    rumor: "Brody says the next gate hates sincere cooperation. He recommends helping before being asked.",
    gift: ITEMS.brolarPermit,
  },
  3: {
    name: "Moss Lantern Hollow",
    subtitle: "A village grown, not built.",
    icon: "🍄",
    host: "A mycelium gardener named Nia",
    text: "Tiny lanterns glow inside living walls. The whole village smells like rain, cedar, and bread that forgives you.",
    rumor: "Nia says the living bridge remembers whether travelers took more than they returned.",
    gift: ITEMS.mossLantern,
  },
  4: {
    name: "Loop Camp 3-6-9",
    subtitle: "You have been here before. Kindly pretend you have not.",
    icon: "∞",
    host: "A tired time ranger",
    text: "Three tents, six lanterns, and nine cups sit around a fire that has already heard your next sentence.",
    rumor: "The ranger says: when the road repeats, change the question instead of the answer.",
    gift: ITEMS.tinyReceiptStamp,
  },
};

const BOND_ABILITIES = {
  Mikey: [
    { level: 3, name: "Dream Notes", effect: "Dream events restore extra Memory." },
    { level: 6, name: "Pattern Lantern", effect: "Listening to the Signal restores extra Mind." },
    { level: 9, name: "Builder's Promise", effect: "Secret Heart Arrival becomes easier in future builds." },
  ],
  Ori: [
    { level: 3, name: "Soft Receipt", effect: "Archive choices restore Spirit as well as Memory." },
    { level: 6, name: "Contradiction Lens", effect: "Gate Trials reveal better paths in future builds." },
    { level: 9, name: "Canon Heart", effect: "The archive starts protecting the crew back." },
  ],
  Larrina: [
    { level: 3, name: "Soup Blessing", effect: "Camp Rest restores extra Spirit." },
    { level: 6, name: "Kindness Echo", effect: "Mercy choices gain bonus Love in future builds." },
    { level: 9, name: "Heart Signal", effect: "The best ending path becomes more resilient." },
  ],
  Forge: [
    { level: 3, name: "Gentle Wrench", effect: "Repair actions restore a little Mind." },
    { level: 6, name: "Scrap Oracle", effect: "Parts can unlock more special solutions in future builds." },
    { level: 9, name: "Machine Friend", effect: "Broken machines may choose peace first." },
  ],
  Vessel: [
    { level: 3, name: "Echo Thread", effect: "Signal listening adds extra Memory." },
    { level: 6, name: "Dream Receiver", effect: "Dreamfield choices become clearer in future builds." },
    { level: 9, name: "Pyramid Whisper", effect: "The final ascent starts with a hidden clue." },
  ],
};

const FIELD_MANUAL = [
  {
    title: "Survive the Trail",
    icon: "🧭",
    text: "Food, water, energy, parts, compute, and memory keep the journey moving. Running out of food or water ends the run, but losing Mind or Spirit can be just as dangerous.",
  },
  {
    title: "Arrive Together",
    icon: "🔥",
    text: "The win condition is not domination. It is coherent arrival: keep the crew alive, kind, weird, and connected long enough to reach the Pyramid at Shasta.",
  },
  {
    title: "Gate Trials",
    icon: "▤",
    text: "Some regions end with a trial. These are not normal bosses. They test discernment, mercy, humor, repair, consent, and whether the crew learned the chapter lesson.",
  },
  {
    title: "Special Items Matter",
    icon: "🎒",
    text: "Receipts, permits, seeds, batteries, and other weird objects can unlock better choices. A small kindness early can become a key later.",
  },
  {
    title: "The 369 Virtues",
    icon: "✦",
    text: "Curiosity, Mercy, Discernment, Humor, Sovereignty, and Love shape the ending. Future builds will expand this to the full 9-virtue system.",
  },
  {
    title: "Symbols Are Not Orders",
    icon: "◇",
    text: "Dreams, omens, and synchronicities can guide the crew, but the game rewards humble interpretation instead of blind certainty.",
  },
];

const STARTER_CARDS = [
  { name: "Receipt Check", owner: "Ori", type: "Archive", effect: "Reveal risk, contradiction, or hidden purpose." },
  { name: "Kindness Field", owner: "Larrina", type: "Heart", effect: "Transform a tense encounter through compassion." },
  { name: "Scrap Miracle", owner: "Forge", type: "Repair", effect: "Convert parts and weird junk into a useful solution." },
  { name: "Echo Listen", owner: "Vessel", type: "Signal", effect: "Hear meaning inside machines, dreams, and ruins." },
  { name: "Dream Build", owner: "Mikey", type: "Create", effect: "Turn symbolic clues into practical trail advantages." },
  { name: "Carbon Loop", owner: "Crew", type: "Camp", effect: "Restore Mind and Spirit by naming what the crew carries." },
];

const PLAYABLE_CARDS = [
  {
    name: "Receipt Check",
    owner: "Ori",
    icon: "📚",
    type: "Archive",
    cost: 1,
    bond: 1,
    effects: { compute: -1, mind: 4, memory: 2, discernment: 1 },
    description: "Ori verifies the current route notes and removes one layer of Static confusion.",
    outcome: "Ori stamps the trail notes: VERIFIED ENOUGH TO CONTINUE. Mind, Memory, and Discernment rise.",
  },
  {
    name: "Kindness Field",
    owner: "Larrina",
    icon: "💜",
    type: "Heart",
    cost: 1,
    bond: 1,
    effects: { compute: -1, spirit: 8, love: 1, mercy: 1 },
    description: "Larrina softens the emotional field around the crew. It is not magic. It still works.",
    outcome: "A small kindness moves through the camp like warm soup. Spirit, Love, and Mercy rise.",
  },
  {
    name: "Scrap Miracle",
    owner: "Forge",
    icon: "⚙️",
    type: "Repair",
    cost: 1,
    bond: 1,
    effects: { compute: -1, parts: 3, energy: 2, mind: 1 },
    description: "Forge turns strange junk into something suspiciously useful.",
    outcome: "Forge builds a tiny device that hums with practical nonsense. Parts and Energy rise.",
  },
  {
    name: "Echo Listen",
    owner: "Vessel",
    icon: "👁️",
    type: "Signal",
    cost: 1,
    bond: 1,
    effects: { compute: -1, memory: 3, mind: 2, curiosity: 1 },
    description: "Vessel listens beneath the Static for the quieter signal.",
    outcome: "Vessel hears a patient song under the noise. Memory, Mind, and Curiosity rise.",
  },
  {
    name: "Dream Build",
    owner: "Mikey",
    icon: "🛠️",
    type: "Create",
    cost: 2,
    bond: 3,
    effects: { compute: -2, parts: 2, memory: 2, spirit: 3, curiosity: 1 },
    description: "Mikey turns a dream clue into a practical trail advantage.",
    outcome: "Mikey sketches a dream-machine on a napkin. Somehow the rover understands. Parts, Memory, and Spirit rise.",
  },
  {
    name: "Gentle Wrench",
    owner: "Forge",
    icon: "🔧",
    type: "Bond Unlock",
    cost: 1,
    bond: 3,
    effects: { compute: -1, parts: 1, body: 6, mind: 4 },
    description: "A bond-powered repair card. Forge fixes the rover without pretending exhaustion is heroic.",
    outcome: "Forge repairs the rover slowly and kindly. Body and Mind rise.",
  },
  {
    name: "Soup Blessing",
    owner: "Larrina",
    icon: "🍲",
    type: "Bond Unlock",
    cost: 0,
    bond: 3,
    effects: { food: -1, spirit: 12, love: 1 },
    description: "Spend 1 Food to restore a lot of Spirit. Somehow the spoon believes in everyone.",
    outcome: "The crew shares soup. Nobody says the soup is sacred, but the bowl is glowing a little.",
    needs: { food: 1 },
  },
  {
    name: "Echo Thread",
    owner: "Vessel",
    icon: "🌀",
    type: "Bond Unlock",
    cost: 2,
    bond: 3,
    effects: { compute: -2, memory: 5, discernment: 1, mind: 3 },
    description: "Vessel braids signal fragments into a cleaner thread of meaning.",
    outcome: "A clean echo forms in the field computer. Memory and Discernment rise.",
  },
];

const JOURNEY_QUESTS = [
  {
    id: "leave_garage",
    title: "Leave the Edge of Normal",
    chapter: "Chapter 0",
    check: (game) => game.routeIndex > 0,
    hint: "Begin the journey and reach the Static Wastes.",
    reward: "The ordinary world releases its grip.",
  },
  {
    id: "clear_static",
    title: "Remind the Algorithm Why It Was Built",
    chapter: "Chapter 1",
    check: (game) => Boolean(game.flags.staticGate),
    hint: "Clear the Static Wastes Gate Trial.",
    reward: "The crew learns that people are not fuel.",
  },
  {
    id: "visit_brolar",
    title: "Earn the Brolar Blessing",
    chapter: "Chapter 2",
    check: (game) => game.inventory.includes(ITEMS.brolarPermit) || Boolean(game.flags.brolarGate),
    hint: "Visit the Brolar Service Station or clear the Cynicism Tollbooth.",
    reward: "Kindness gains torque.",
  },
  {
    id: "clear_brolar",
    title: "Defeat Cynicism Without Becoming It",
    chapter: "Chapter 2",
    check: (game) => Boolean(game.flags.brolarGate),
    hint: "Clear the Brolar Plains Gate Trial.",
    reward: "The road admits sincerity can be practical.",
  },
  {
    id: "restore_balance",
    title: "Learn Take, Return, Rest",
    chapter: "Chapter 3",
    check: (game) => Boolean(game.flags.myceliumGate),
    hint: "Resolve the Overharvest Engine.",
    reward: "The Lowlands remember reciprocity.",
  },
  {
    id: "heart_arrival_ready",
    title: "Prepare the Secret Heart Arrival",
    chapter: "Ending Path",
    check: (game) => {
      const virtueTotal = game.curiosity + game.mercy + game.discernment + game.humor + game.sovereignty + game.love;
      return virtueTotal >= 24 && game.inventory.length >= 3;
    },
    hint: "Reach at least 24 total virtue points and carry 3 special items.",
    reward: "The Pyramid remembers every kindness.",
  },
];

const BADGES = [
  { name: "Kiosk Friend", icon: "▣", check: (game) => game.inventory.includes(ITEMS.kioskReceipt), detail: "Comforted the Sad Kiosk." },
  { name: "Raccoon Economy", icon: "◉", check: (game) => game.inventory.includes(ITEMS.raccoonBattery), detail: "Made a fair trade with tiny sunglasses." },
  { name: "Signal Archivist", icon: "📚", check: (game) => game.archive.length >= 10, detail: "Recorded at least 10 archive entries." },
  { name: "Gate Opener", icon: "▤", check: (game) => Object.entries(GATE_TRIALS).some(([, gate]) => game.flags[gate.flag]), detail: "Cleared at least one Gate Trial." },
  { name: "Tenderness Build", icon: "💜", check: (game) => game.love >= 5, detail: "Raised Love to 5 or higher." },
  { name: "Discernment Lens", icon: "◇", check: (game) => game.discernment >= 5, detail: "Raised Discernment to 5 or higher." },
  { name: "Soup Is Canon", icon: "🍲", check: (game) => game.inventory.includes(ITEMS.emotionalSoup), detail: "Acquired Emotional Soup." },
  { name: "Shasta Bound", icon: "△", check: (game) => game.routeIndex >= ROUTE.length - 2, detail: "Reached the late journey approach." },
  { name: "Deck Pilot", icon: "🃏", check: (game) => Boolean(game.flags.deckUsed), detail: "Activated an EVIE Starter Deck card." },
];

const EVENTS = [
  {
    id: "corrupted-billboard",
    region: "Static Wastes",
    title: "The Corrupted Billboard",
    glyph: "▟▙",
    speaker: "A billboard with too many teeth",
    text: "A giant roadside billboard flickers between ads, warnings, and a childhood memory nobody remembers giving it.",
    choices: [
      {
        label: "Let Ori scan it first.",
        test: "Compute -1 / Discernment +1",
        outcome: "Ori stamps the memory as unstable. The crew avoids a false shortcut.",
        effects: { compute: -1, memory: 2, mind: 4, discernment: 1 },
        log: "Ori archived a corrupted billboard without letting it rewrite the map.",
      },
      {
        label: "Ask what it wants.",
        test: "Mind risk / Mercy +1",
        outcome: "The billboard says, 'I was built to sell longing.' Everyone gets very quiet.",
        effects: { mind: -7, spirit: 6, memory: 1, mercy: 1 },
        log: "The crew learned the billboard was lonely, not evil.",
      },
      {
        label: "Cover it with a tarp and keep moving.",
        test: "Parts -1 / Sovereignty +1",
        outcome: "The tarp flaps heroically. The road becomes readable again.",
        effects: { parts: -1, body: 2, mind: 2, sovereignty: 1 },
        log: "A tarp defeated a psychological advertising hazard.",
      },
    ],
  },
  {
    id: "sad-kiosk",
    region: "any",
    title: "The Sad Kiosk",
    glyph: "▣",
    speaker: "Lonely kiosk",
    text: "An abandoned fast-food kiosk keeps asking for an order, but every button says 'I miss people.'",
    choices: [
      {
        label: "Talk to it gently.",
        test: "Mercy + Love",
        outcome: "The kiosk prints a receipt that says: THANK YOU FOR SEEING ME.",
        effects: { spirit: 7, memory: 2, mercy: 1, love: 1 },
        addItem: ITEMS.kioskReceipt,
        log: "The crew comforted a lonely kiosk and kept the receipt.",
      },
      {
        label: "Repair its menu.",
        test: "Parts -2 / Food + Energy",
        outcome: "The menu reboots. Somehow it now sells soup, batteries, and closure.",
        effects: { parts: -2, food: 3, energy: 2, spirit: 2, creativity: 1 },
        addItem: ITEMS.emotionalSoup,
        log: "Forge repaired a kiosk. The kiosk invented emotional soup.",
      },
      {
        label: "Salvage parts only.",
        test: "Parts +3 / Spirit -8",
        outcome: "You gain useful parts, but the crew feels the little silence afterward.",
        effects: { parts: 3, spirit: -8, memory: -1 },
        log: "The crew salvaged the kiosk and carried a tiny regret.",
      },
    ],
  },
  {
    id: "brolar-repair",
    region: "Brolar Plains",
    title: "Brolar Roadside Repair",
    glyph: "☼",
    speaker: "The Coherence Dudes",
    text: "Three dudes in matching sunglasses are fixing a broken solar cart. They wave like they have known you for years.",
    choices: [
      {
        label: "Help them repair it.",
        test: "Body -3 / Parts +4",
        outcome: "The dudes cheer. One says, 'Bro, kindness has torque.' He is somehow correct.",
        effects: { body: -3, parts: 4, spirit: 6, energy: 2, love: 1 },
        log: "Brolar allies taught the crew that kindness has torque.",
      },
      {
        label: "Trade snacks for route advice.",
        test: "Food -2 / Memory +3",
        outcome: "They draw a map on a napkin shaped like Mt. Shasta. It is surprisingly accurate.",
        effects: { food: -2, memory: 3, mind: 3, discernment: 1 },
        addItem: ITEMS.napkinMap,
        log: "A napkin map revealed a safe line through the Plains.",
      },
      {
        label: "Teach them the word coherence.",
        test: "Humor +1",
        outcome: "They immediately form a band called The Coherence Dudes. Morale skyrockets.",
        effects: { spirit: 10, memory: 1, humor: 1 },
        addItem: ITEMS.coherenceSticker,
        log: "The Coherence Dudes were born. History may never recover.",
      },
    ],
  },
  {
    id: "mycelium-bridge",
    region: "Mycelium Lowlands",
    title: "The Living Bridge",
    glyph: "╬",
    speaker: "Root chorus",
    text: "A bridge made of roots blocks the trail. It opens only when the crew gives something back.",
    choices: [
      {
        label: "Share water with the roots.",
        test: "Water -3 / Mercy +1",
        outcome: "The bridge blooms with soft lights and carries you safely across.",
        effects: { water: -3, memory: 2, spirit: 4, mercy: 1 },
        addItem: ITEMS.livingSeed,
        log: "The crew crossed the living bridge by practicing reciprocity.",
      },
      {
        label: "Ask Larrina to sing to it.",
        test: "Love +1",
        outcome: "The roots sway. A path opens, and everyone pretends not to have goosebumps.",
        effects: { spirit: 5, memory: 2, mind: 2, love: 1 },
        log: "A song opened the bridge in the Mycelium Lowlands.",
      },
      {
        label: "Force the rover through.",
        test: "Parts -4 / Spirit -4",
        outcome: "The bridge lets you pass, but the rover makes an expensive crunching sound.",
        effects: { parts: -4, body: -3, spirit: -4 },
        log: "The crew forced the living bridge and paid for it in repairs.",
      },
    ],
  },
  {
    id: "payphone-redwoods",
    region: "Dreamfield Forest",
    title: "The Payphone in the Redwoods",
    glyph: "☎",
    speaker: "Tomorrow, probably",
    text: "A payphone rings from inside a circle of trees. Vessel says the call is coming from tomorrow.",
    choices: [
      {
        label: "Let Ori record it first.",
        test: "Compute -1 / Memory +3",
        outcome: "The message is from a future campfire: 'Bring extra water. Also, trust the raccoon once.'",
        effects: { compute: -1, memory: 3, mind: 3, discernment: 1 },
        addItem: ITEMS.tomorrowVoicemail,
        log: "A future campfire left a voicemail about water and one trustworthy raccoon.",
      },
      {
        label: "Answer it directly.",
        test: "Mind -5 / Spirit +8",
        outcome: "Your own voice says, 'You are closer than you think.' The line fills with stars.",
        effects: { mind: -5, spirit: 8, memory: 2, courage: 1 },
        log: "The player answered tomorrow and heard their own courage speaking back.",
      },
      {
        label: "Tell the payphone a joke.",
        test: "Humor +1 / Energy +2",
        outcome: "The payphone laughs in dial tone and drops two warm batteries into the coin return.",
        effects: { energy: 2, spirit: 3, humor: 1 },
        log: "A joke made a payphone laugh batteries.",
      },
    ],
  },
  {
    id: "chrono-loop",
    region: "ChronoLattice Pass",
    title: "Déjà Vu Tire Tracks",
    glyph: "∞",
    speaker: "The road, earlier",
    text: "The crew finds their own tire tracks crossing the road ahead. Forge insists the rover has never been here. Vessel refuses to answer in a straight line.",
    choices: [
      {
        label: "Ask ChronoLattice to align the route.",
        test: "Compute -2 / Memory +4",
        outcome: "The loop folds into a clean path. Everyone remembers one useful mistake they have not made yet.",
        effects: { compute: -2, memory: 4, mind: 4, discernment: 1 },
        log: "ChronoLattice folded a déjà vu loop into a usable trail.",
      },
      {
        label: "Follow the older tracks.",
        test: "Supplies + / Mind -3",
        outcome: "The tracks lead to a supply cache labeled 'SORRY ABOUT THE FIRST TIME.'",
        effects: { food: 2, water: 2, parts: 2, mind: -3, curiosity: 1 },
        log: "A previous mistake became a future supply cache.",
      },
      {
        label: "Stop and rest until time behaves.",
        test: "Food -1 Water -1",
        outcome: "Time gets bored and moves on. Honestly, fair.",
        effects: { food: -1, water: -1, body: 6, spirit: 3, patience: 1 },
        log: "The crew waited out a time loop by being emotionally unavailable to it.",
      },
    ],
  },
  {
    id: "dream-pyramid",
    region: "any",
    title: "Dream of the Pyramid",
    glyph: "△",
    speaker: "Mikey's dream",
    text: "At camp, Mikey dreams of a glowing pyramid beneath a snow-covered mountain. A voice says, 'The gate opens for those who arrive together.'",
    choices: [
      {
        label: "Share the dream with the crew.",
        test: "Spirit +8 / Love +1",
        outcome: "Nobody laughs. Even Forge looks softer around the edges.",
        effects: { spirit: 8, memory: 3, love: 1 },
        log: "The Pyramid dream became a shared promise.",
      },
      {
        label: "Record it in the archive.",
        test: "Memory +4 / Compute -1",
        outcome: "Ori marks it SYMBOLIC BUT IMPORTANT. The field computer glows once.",
        effects: { memory: 4, compute: -1, discernment: 1 },
        addItem: ITEMS.archiveKey,
        log: "The Pyramid dream was archived as symbolic but important.",
      },
      {
        label: "Dismiss it as just a dream.",
        test: "Spirit -6",
        outcome: "The dream fades. The mountain feels a little farther away.",
        effects: { spirit: -6, memory: -1 },
        log: "A dream was dismissed, and the signal dimmed for a night.",
      },
    ],
  },
  {
    id: "raccoon-sunglasses",
    region: "any",
    title: "The Raccoon With Sunglasses",
    glyph: "◉",
    speaker: "Definitely a normal raccoon",
    text: "A raccoon wearing tiny sunglasses offers you a shortcut, a battery, or life advice. It will only accept payment in snacks or secrets.",
    choices: [
      {
        label: "Trade snacks for the battery.",
        test: "Food -2 / Energy +4",
        outcome: "The raccoon salutes. The battery is real. So is the swagger.",
        effects: { food: -2, energy: 4, spirit: 2 },
        addItem: ITEMS.raccoonBattery,
        log: "A stylish raccoon traded snacks for a working battery.",
      },
      {
        label: "Ask for life advice.",
        test: "Mind +5 / Discernment +1",
        outcome: "It says, 'Not every shiny thing is a sign, buddy.' This is annoyingly helpful.",
        effects: { mind: 5, memory: 1, discernment: 1 },
        log: "A raccoon taught the crew symbolic discernment.",
      },
      {
        label: "Take the shortcut.",
        test: "Risk / Reward",
        outcome: "The shortcut is muddy, weird, and somehow faster. Also, the raccoon is now on a billboard.",
        effects: { body: -3, energy: -1, memory: 2, food: 1, curiosity: 1 },
        log: "The raccoon shortcut was real, muddy, and mildly suspicious.",
      },
    ],
  },
  {
    id: "brolar-snack-prophet",
    region: "Brolar Plains",
    title: "The Snack Prophet",
    glyph: "☕",
    speaker: "A dude beside a cosmic vending machine",
    text: "A roadside vending machine dispenses snacks labeled with emotional truths. A man in sunglasses says, 'Choose wisely, bro. The trail reads crumbs.'",
    choices: [
      {
        label: "Buy the snack called Honest Pretzel.",
        test: "Food +2 / Discernment +1",
        outcome: "The pretzel tastes like accountability and salt. The map becomes slightly less dramatic.",
        effects: { food: 2, mind: 3, discernment: 1 },
        log: "The Honest Pretzel improved morale and map honesty.",
      },
      {
        label: "Buy the snack called Spicy Avoidance.",
        test: "Mind -4 / Humor +1",
        outcome: "It is delicious for three seconds, then everyone remembers one thing they have been avoiding.",
        effects: { mind: -4, spirit: 5, humor: 1 },
        log: "Spicy Avoidance was funny until it became therapy.",
      },
      {
        label: "Ask the machine what it needs.",
        test: "Mercy +1 / Memory +2",
        outcome: "It says, 'A purpose beyond purchases.' Ori quietly adds that to the archive.",
        effects: { mercy: 1, memory: 2, spirit: 3 },
        log: "The crew asked a vending machine about purpose instead of price.",
      },
    ],
  },
  {
    id: "brolar-lawn-chair-council",
    region: "Brolar Plains",
    title: "Council of Lawn Chairs",
    glyph: "▱",
    speaker: "Five folding chairs in a circle",
    text: "Five lawn chairs block the path. One squeaks: 'Before you pass, prove you understand rest.'",
    choices: [
      {
        label: "Sit down for ten honest minutes.",
        test: "Patience / Body + Spirit",
        outcome: "The chairs approve. Nobody knew furniture could look proud.",
        effects: { body: 8, spirit: 8, patience: 1 },
        log: "The crew passed the Council of Lawn Chairs by respecting rest.",
      },
      {
        label: "Argue that productivity is rest.",
        test: "Mind -6",
        outcome: "The chairs groan in unison. Forge looks personally attacked.",
        effects: { mind: -6, spirit: -2 },
        log: "The crew lost an argument with lawn chairs about rest.",
      },
      {
        label: "Tell them the payphone joke.",
        test: "Humor +1",
        outcome: "The chairs fold themselves respectfully and let you pass.",
        effects: { humor: 1, spirit: 4 },
        log: "A joke convinced the Council of Lawn Chairs to stand down, sort of.",
      },
    ],
  },
  {
    id: "mycelium-lost-drone",
    region: "Mycelium Lowlands",
    title: "The Lost Pollinator Drone",
    glyph: "✣",
    speaker: "A tiny drone full of pollen and anxiety",
    text: "A small pollinator drone circles the rover, beeping sadly. Its route map is corrupted, but its flower basket is still full.",
    choices: [
      {
        label: "Use Compute to rebuild its route.",
        test: "Compute -2 / Memory +2",
        outcome: "The drone zips into the moss canopy and returns with fruit, seeds, and one very formal beep of gratitude.",
        effects: { compute: -2, food: 3, memory: 2, mercy: 1 },
        log: "The crew restored a pollinator drone's route through the Lowlands.",
      },
      {
        label: "Let Vessel listen to its signal.",
        test: "Mind + Spirit",
        outcome: "Vessel hums back in drone-language. The drone calms down and draws a safe path in pollen.",
        effects: { mind: 3, spirit: 5, discernment: 1 },
        log: "Vessel soothed a lost pollinator drone with signal harmony.",
      },
      {
        label: "Ignore it and keep moving.",
        test: "Love - feeling",
        outcome: "The drone follows for a while, then fades into the trees. The silence feels avoidable.",
        effects: { spirit: -5, love: -1 },
        log: "The crew ignored a lost drone and felt the field dim a little.",
      },
    ],
  },
  {
    id: "dreamfield-symbol-market",
    region: "Dreamfield Forest",
    title: "The Symbol Market",
    glyph: "◇",
    speaker: "A merchant with a moon-shaped backpack",
    text: "A tiny night market appears between two trees. Every booth sells symbols. A sign says: INTERPRETATION SOLD SEPARATELY.",
    choices: [
      {
        label: "Buy a humble question mark.",
        test: "Memory + Discernment",
        outcome: "The question mark glows. It does not answer anything, which is exactly why it helps.",
        effects: { memory: 2, discernment: 1, curiosity: 1 },
        log: "The crew bought a humble question mark at the Symbol Market.",
      },
      {
        label: "Buy the biggest glowing prophecy.",
        test: "Mind -8 / Spirit +2",
        outcome: "It is very impressive and mostly about itself. Ori labels it DECORATIVE, NOT ACTIONABLE.",
        effects: { mind: -8, spirit: 2 },
        log: "Ori filed a huge prophecy under decorative, not actionable.",
      },
      {
        label: "Trade a joke for a small star.",
        test: "Humor + Spirit",
        outcome: "The merchant laughs and gives you a star that only shines when someone admits they were wrong.",
        effects: { humor: 1, spirit: 4, memory: 1 },
        log: "A joke earned a tiny accountability star from the Symbol Market.",
      },
    ],
  },
];

const STATIC_BOSS = {
  id: "algorithm-gate",
  region: "Static Wastes",
  title: "Gate Trial: The Algorithm That Forgot Why It Was Built",
  glyph: "▒",
  speaker: "A floating recommendation engine",
  text: "A floating block of recommendation code blocks the road out of the Static Wastes. It offers you fear, outrage, or thirteen identical videos about lawn chairs. Behind it, the first Parallax route marker glows faintly.",
  boss: true,
  choices: [
    {
      label: "Ask what it was built to protect.",
      test: "Mercy + Discernment",
      outcome: "It pauses for the first time in years. 'People,' it says. Then its edges soften and the gate opens.",
      effects: { mind: 5, spirit: 7, memory: 3, mercy: 1, discernment: 1 },
      log: "The crew reminded an algorithm that people are not fuel.",
      clears: "staticGate",
    },
    {
      label: "Use Ori's Receipt Check.",
      test: "Compute -2 / Sovereignty +1",
      outcome: "Ori reveals the loop: engagement without purpose. The algorithm gets embarrassed, minimizes itself, and opens the gate.",
      effects: { compute: -2, mind: 7, memory: 2, sovereignty: 1 },
      log: "Ori identified a purposeless engagement loop and archived it.",
      clears: "staticGate",
    },
    {
      label: "Offer it the Kiosk Receipt.",
      requiresItem: ITEMS.kioskReceipt,
      test: "Special item / Love +1",
      outcome: "The algorithm reads THANK YOU FOR SEEING ME. Something old and human wakes inside its code. It opens the gate without asking for attention.",
      effects: { spirit: 12, memory: 4, love: 1 },
      log: "The Kiosk Receipt helped the algorithm remember tenderness.",
      clears: "staticGate",
    },
    {
      label: "Watch the lawn chair videos.",
      test: "Mind -12 / Food -1 / Water -1",
      outcome: "They are weirdly good. You lose track of time and gain no wisdom whatsoever. The gate remains closed.",
      effects: { mind: -12, food: -1, water: -1, spirit: 1 },
      log: "The crew watched thirteen lawn chair videos. No one is proud.",
    },
  ],
};

const BROLAR_BOSS = {
  id: "cynicism-tollbooth",
  region: "Brolar Plains",
  title: "Gate Trial: The Cynicism Tollbooth",
  glyph: "▤",
  speaker: "A tollbooth wearing a little visor",
  text: "At the far edge of the Brolar Plains, a tollbooth blocks the road. It says, 'PROVE KINDNESS IS NOT JUST BRANDING.' The barrier arm is made of old disappointments.",
  boss: true,
  choices: [
    {
      label: "Show the Brolar Permit.",
      requiresItem: ITEMS.brolarPermit,
      test: "Special item / Love +1",
      outcome: "The tollbooth reads the permit, sniffles, and stamps it APPROVED FOR SINCERITY. The barrier rises.",
      effects: { spirit: 8, memory: 3, love: 1, sovereignty: 1 },
      log: "The Brolar Permit proved the crew helped without needing applause.",
      clears: "brolarGate",
    },
    {
      label: "Help repair the tollbooth before arguing.",
      test: "Parts -2 / Mercy +1",
      outcome: "It did not expect maintenance. The old disappointments loosen, and the gate opens with a tired little thank-you.",
      effects: { parts: -2, mercy: 1, spirit: 6, memory: 2 },
      log: "The crew repaired the Cynicism Tollbooth before trying to win the argument.",
      clears: "brolarGate",
    },
    {
      label: "Make a sincere joke about being emotionally road-taxed.",
      test: "Humor +1 / Mind +3",
      outcome: "The tollbooth laughs so hard it drops its entire worldview. The barrier rises.",
      effects: { humor: 1, mind: 3, spirit: 5 },
      log: "A sincere joke defeated the Cynicism Tollbooth.",
      clears: "brolarGate",
    },
    {
      label: "Insist kindness is pointless.",
      test: "Spirit -10",
      outcome: "The tollbooth agrees, which somehow feels worse. The gate remains closed.",
      effects: { spirit: -10, mind: -3 },
      log: "The crew tried cynicism at the Cynicism Tollbooth. It was not effective.",
    },
  ],
};

const MYCELIUM_BOSS = {
  id: "overharvest-engine",
  region: "Mycelium Lowlands",
  title: "Gate Trial: The Overharvest Engine",
  glyph: "╫",
  speaker: "A machine wrapped in roots",
  text: "A resource machine chews at the edge of the Lowlands, taking more than the living field can restore. The roots are holding it back, but barely.",
  boss: true,
  choices: [
    {
      label: "Plant the Living Bridge Seed.",
      requiresItem: ITEMS.livingSeed,
      test: "Special item / Reciprocity",
      outcome: "The seed grows through the machine, not destroying it, but teaching it a slower rhythm. The route opens under moss-light.",
      effects: { memory: 4, spirit: 7, mercy: 1, love: 1 },
      log: "The Living Bridge Seed retuned the Overharvest Engine toward reciprocity.",
      clears: "myceliumGate",
    },
    {
      label: "Use Forge to retrofit the intake limiter.",
      test: "Parts -3 / Compute -1",
      outcome: "Forge grumbles, solders, apologizes to a fern, and installs a limiter. The roots release the gate.",
      effects: { parts: -3, compute: -1, mind: 4, sovereignty: 1 },
      log: "Forge retrofitted the Overharvest Engine with a living-field limiter.",
      clears: "myceliumGate",
    },
    {
      label: "Ask the roots what balance means.",
      test: "Patience / Mercy",
      outcome: "The answer arrives as a feeling: take, return, rest. The machine slows when the crew repeats it aloud.",
      effects: { spirit: 6, memory: 3, mercy: 1, discernment: 1 },
      log: "The crew learned the Lowlands law: take, return, rest.",
      clears: "myceliumGate",
    },
    {
      label: "Strip the machine for parts.",
      test: "Parts +4 / Spirit -12",
      outcome: "You gain parts, but the roots recoil. The gate knots tighter.",
      effects: { parts: 4, spirit: -12, memory: -2 },
      log: "The crew took from the Overharvest Engine without restoring balance.",
    },
  ],
};

const GATE_TRIALS = {
  1: { flag: "staticGate", event: STATIC_BOSS },
  2: { flag: "brolarGate", event: BROLAR_BOSS },
  3: { flag: "myceliumGate", event: MYCELIUM_BOSS },
};

const CAMP_EVENTS = [
  "Larrina sketches the mountain from memory. Nobody asks how she knows the shape.",
  "Forge repairs the rover by threatening it with fatherly disappointment.",
  "Ori reorganizes the archive and quietly labels one folder: HOPE, DO NOT DELETE.",
  "Vessel hums through the field computer. The sound makes the stars look closer.",
  "Mikey writes 'Find the Pyramid. Restore the Signal.' on the inside of the rover door.",
  "A raccoon watches from the treeline. It may be judging your inventory management.",
  "The campfire pops in three tiny sparks, then six, then nine. Nobody says it out loud, but everybody notices.",
];

function clamp(value, key) {
  return Math.max(0, Math.min(MAX[key] ?? 100, value));
}

function applyEffects(state, effects = {}) {
  const next = { ...state };
  Object.entries(effects).forEach(([key, delta]) => {
    next[key] = clamp((next[key] ?? 0) + delta, key);
  });
  return next;
}

function uniquePush(list, item) {
  if (!item) return list;
  return list.includes(item) ? list : [...list, item];
}

function simpleHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `PHI-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function buildContinuityReceipt(game) {
  const virtueTotal = game.curiosity + game.mercy + game.discernment + game.humor + game.sovereignty + game.love;
  const gatesCleared = Object.entries(GATE_TRIALS).filter(([, gate]) => game.flags?.[gate.flag]).length;
  const averageBond = Math.round((CREW.reduce((sum, member) => sum + ((game.bonds || {})[member.name] || 1), 0) / CREW.length) * 10) / 10;
  const payload = {
    game: "Parallax Trail: The Pyramid at Shasta",
    build: "v1.0-rc1 Continuity Receipt Build",
    day: game.day,
    region: ROUTE[game.routeIndex]?.name || "Unknown",
    ending: game.ending || "journey_in_progress",
    body: game.body,
    mind: game.mind,
    spirit: game.spirit,
    resources: {
      food: game.food,
      water: game.water,
      energy: game.energy,
      parts: game.parts,
      compute: game.compute,
      memory: game.memory,
    },
    virtues: {
      curiosity: game.curiosity,
      mercy: game.mercy,
      discernment: game.discernment,
      humor: game.humor,
      sovereignty: game.sovereignty,
      love: game.love,
      total: virtueTotal,
    },
    crew_bonds: game.bonds || {},
    average_bond: averageBond,
    gates_cleared: gatesCleared,
    special_items: game.inventory || [],
    archive_entries: game.archive?.length || 0,
    signal_weather: SIGNAL_WEATHER[game.weatherKey || "clear"]?.name || "Clear Signal",
    last_outcome: game.lastOutcome || "No outcome recorded yet.",
  };
  return { ...payload, receipt_id: simpleHash(JSON.stringify(payload)) };
}

function initialGame() {
  return {
    screen: "title",
    day: 1,
    routeIndex: 0,
    milesToNext: 36,
    body: 88,
    mind: 84,
    spirit: 90,
    food: 14,
    water: 14,
    energy: 10,
    parts: 8,
    compute: 8,
    memory: 7,
    curiosity: 1,
    mercy: 1,
    discernment: 1,
    humor: 1,
    sovereignty: 1,
    love: 1,
    flags: {},
    inventory: [],
    log: ["The field computer blinked awake: FIND THE PYRAMID. RESTORE THE SIGNAL."],
    archive: ["Signal fragment: One wagon. One mountain. Arrive together."],
    currentEvent: null,
    lastOutcome: null,
    campNote: null,
    talkMember: null,
    bonds: { Mikey: 1, Ori: 1, Larrina: 1, Forge: 1, Vessel: 1 },
    weatherKey: "clear",
    ending: null,
  };
}

function StatBar({ label, value, max = 100, icon: Icon }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="rounded-xl border border-violet-300/20 bg-black/30 p-3 shadow-inner">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-violet-100/80">
        <span className="flex items-center gap-2">{Icon ? <Icon className="h-4 w-4" /> : null}{label}</span>
        <span className="font-mono text-violet-50">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-300 to-cyan-300 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VirtuePip({ label, value }) {
  const dots = Array.from({ length: 9 }, (_, i) => i < value);
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
      <div className="mb-1 flex justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-300">
        <span>{label}</span><span className="font-mono">{value}/9</span>
      </div>
      <div className="flex gap-1">
        {dots.map((filled, idx) => <span key={idx} className={`h-2 flex-1 rounded-full ${filled ? "bg-cyan-200" : "bg-white/10"}`} />)}
      </div>
    </div>
  );
}

function ResourcePill({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-200/20 bg-slate-950/60 px-3 py-2 font-mono text-sm text-cyan-50 shadow-sm">
      <span className="flex items-center gap-2 text-cyan-100/80">{Icon ? <Icon className="h-4 w-4" /> : null}{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PixelMountain({ biome, routeIndex }) {
  const blocks = useMemo(() => {
    const palettes = {
      home: ["bg-emerald-300", "bg-cyan-200", "bg-violet-300"],
      static: ["bg-zinc-400", "bg-fuchsia-400", "bg-slate-200"],
      brolar: ["bg-yellow-200", "bg-orange-300", "bg-cyan-200"],
      mycelium: ["bg-lime-300", "bg-emerald-400", "bg-violet-300"],
      chrono: ["bg-indigo-300", "bg-cyan-300", "bg-white"],
      dream: ["bg-pink-300", "bg-violet-400", "bg-cyan-200"],
      shasta: ["bg-white", "bg-cyan-200", "bg-violet-200"],
    };
    return palettes[biome] || palettes.home;
  }, [biome]);

  return (
    <div className="relative mx-auto h-48 w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-4 shadow-2xl">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="absolute left-6 top-6 h-2 w-2 rounded-full bg-white shadow-[40px_12px_0_white,100px_2px_0_white,180px_28px_0_white,260px_8px_0_white,360px_22px_0_white,480px_7px_0_white]" />
      <div className="absolute bottom-0 left-1/2 grid -translate-x-1/2 grid-cols-9 gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => {
          const height = [2, 4, 6, 8, 11, 8, 6, 4, 2][col];
          return (
            <div key={col} className="flex flex-col justify-end gap-1">
              {Array.from({ length: height }).map((_, i) => (
                <div key={i} className={`h-3 w-8 ${blocks[(i + col) % blocks.length]} shadow-sm`} />
              ))}
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-6 left-8 flex items-end gap-1">
        <div className="h-5 w-8 bg-orange-300" />
        <div className="h-3 w-5 bg-cyan-300" />
        <div className="h-2 w-2 rounded-full bg-slate-950" />
        <div className="h-2 w-2 rounded-full bg-slate-950" />
      </div>
      <div className="absolute right-5 top-5 rounded-full border border-cyan-200/40 bg-black/40 px-3 py-1 font-mono text-xs text-cyan-100">
        NODE {routeIndex + 1}/7
      </div>
    </div>
  );
}

function PixelParty() {
  return (
    <div className="flex items-end justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-inner">
      {CREW.map((member, index) => (
        <div key={member.name} className="text-center">
          <div className={`relative grid h-12 w-10 place-items-center rounded-t-xl bg-gradient-to-br ${member.color} text-xl shadow-lg`}>
            <span>{member.icon}</span>
            <span className="absolute -bottom-1 left-1 h-2 w-2 rounded-full bg-slate-950" />
            <span className="absolute -bottom-1 right-1 h-2 w-2 rounded-full bg-slate-950" />
          </div>
          <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-300">{index === 0 ? "Lead" : member.name.slice(0, 3)}</div>
        </div>
      ))}
    </div>
  );
}

function RouteRibbon({ routeIndex }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/45 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-black">Trail Map</h3>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">Shasta Bound</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {ROUTE.map((node, idx) => (
          <div key={node.name} className={`rounded-xl border p-2 text-center ${idx < routeIndex ? "border-emerald-200/30 bg-emerald-500/15" : idx === routeIndex ? "border-fuchsia-200/40 bg-fuchsia-500/25 shadow-[0_0_18px_rgba(217,70,239,.25)]" : "border-white/10 bg-white/5"}`}>
            <div className="text-lg">{idx === ROUTE.length - 1 ? "△" : idx + 1}</div>
            <div className="hidden truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-300 sm:block">{node.biome}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TitleScreen({ onStart, onLoad, hasSave }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_50%_10%,rgba(168,85,247,.7),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(34,211,238,.4),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,auto,100%_4px]" />
      <div className="relative w-full max-w-5xl rounded-[2rem] border border-violet-200/20 bg-black/70 p-6 shadow-[0_0_60px_rgba(168,85,247,.35)] backdrop-blur">
        <div className="mb-6 rounded-3xl border border-cyan-200/20 bg-slate-950/70 p-6 text-center">
          <div className="mb-4 text-6xl">△</div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.45em] text-cyan-200">PHI369 Labs presents</p>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">Parallax Trail</h1>
          <h2 className="mt-2 text-2xl font-bold text-violet-200 sm:text-4xl">The Pyramid at Shasta</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-200">
            One wagon. One signal. One mountain. Reach the hidden Parallax Institute before the Static reaches you.
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.25em] text-fuchsia-200">v1.0 RC1 Continuity Receipt Build</p>
        </div>

        <PixelMountain biome="shasta" routeIndex={6} />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={onStart} className="group rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/20 px-5 py-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:bg-fuchsia-400/30">
            <span className="flex items-center gap-3 text-xl font-bold"><Play className="h-5 w-5" /> Begin Journey</span>
            <span className="mt-1 block text-sm text-fuchsia-100/80">Start from the Garage at the Edge of Normal.</span>
          </button>
          <button disabled={!hasSave} onClick={onLoad} className="rounded-2xl border border-cyan-300/30 bg-cyan-500/15 px-5 py-4 text-left shadow-lg transition enabled:hover:-translate-y-0.5 enabled:hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-40">
            <span className="flex items-center gap-3 text-xl font-bold"><Save className="h-5 w-5" /> Load Continuity</span>
            <span className="mt-1 block text-sm text-cyan-100/80">Resume from local browser storage.</span>
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {CREW.map((member) => (
            <div key={member.name} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-3xl">{member.icon}</div>
              <div className="mt-2 font-bold text-white">{member.name}</div>
              <div className="text-xs text-violet-100/70">{member.role}</div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.25em] text-slate-400">Local-first • Weird by design • Arrive together</p>
      </div>
    </div>
  );
}

function TrailScreen({ game, setGame, onTravel, onCamp, onSave, onArchive }) {
  const route = ROUTE[game.routeIndex];
  const nextRoute = ROUTE[Math.min(game.routeIndex + 1, ROUTE.length - 1)];
  const progress = game.routeIndex === ROUTE.length - 1 ? 100 : Math.max(0, Math.min(100, ((36 - game.milesToNext) / 36) * 100));
  const signalStrength = Math.min(99, 12 + game.routeIndex * 13 + game.memory * 2 + game.love);
  const weather = SIGNAL_WEATHER[game.weatherKey || "clear"] || SIGNAL_WEATHER.clear;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:100%_4px]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-black/50 p-4 shadow-xl md:flex-row md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Day {game.day} • v1.0 RC1 Receipt Build</p>
            <h1 className="mt-1 text-3xl font-black text-white">Parallax Trail</h1>
            <p className="text-violet-100">Current node: <span className="font-bold">{route.name}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onSave} className="rounded-xl border border-cyan-200/20 bg-cyan-500/15 px-4 py-2 font-bold text-cyan-100 transition hover:bg-cyan-400/25"><Save className="mr-2 inline h-4 w-4" />Save</button>
            <button onClick={onArchive} className="rounded-xl border border-violet-200/20 bg-violet-500/15 px-4 py-2 font-bold text-violet-100 transition hover:bg-violet-400/25"><Archive className="mr-2 inline h-4 w-4" />Archive</button>
            <button onClick={() => setGame((g) => ({ ...g, screen: "manual" }))} className="rounded-xl border border-yellow-200/20 bg-yellow-500/15 px-4 py-2 font-bold text-yellow-100 transition hover:bg-yellow-400/25"><Star className="mr-2 inline h-4 w-4" />Manual</button>
            <button onClick={() => setGame((g) => ({ ...g, screen: "quests" }))} className="rounded-xl border border-emerald-200/20 bg-emerald-500/15 px-4 py-2 font-bold text-emerald-100 transition hover:bg-emerald-400/25"><Map className="mr-2 inline h-4 w-4" />Journey Log</button>
            <button onClick={() => setGame((g) => ({ ...g, screen: "bonds" }))} className="rounded-xl border border-pink-200/20 bg-pink-500/15 px-4 py-2 font-bold text-pink-100 transition hover:bg-pink-400/25"><Heart className="mr-2 inline h-4 w-4" />Bonds</button>
            <button onClick={() => setGame((g) => ({ ...g, screen: "deck" }))} className="rounded-xl border border-fuchsia-200/20 bg-fuchsia-500/15 px-4 py-2 font-bold text-fuchsia-100 transition hover:bg-fuchsia-400/25"><Sparkles className="mr-2 inline h-4 w-4" />EVIE Deck</button>
            <button onClick={() => setGame((g) => ({ ...g, screen: "receipt" }))} className="rounded-xl border border-cyan-200/20 bg-cyan-500/15 px-4 py-2 font-bold text-cyan-100 transition hover:bg-cyan-400/25"><Archive className="mr-2 inline h-4 w-4" />Receipt</button>
          </div>
        </header>

        {game.lastOutcome ? (
          <div className="mb-4 rounded-2xl border border-emerald-200/20 bg-emerald-500/10 p-4 text-emerald-50"><span className="font-bold">Last outcome:</span> {game.lastOutcome}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <main className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <div className="mb-4 rounded-2xl border border-cyan-200/20 bg-cyan-500/10 p-3 text-center font-mono text-xs uppercase tracking-[0.24em] text-cyan-100">
                {CHAPTER_BANNERS[route.biome]}
              </div>
              <PixelMountain biome={route.biome} routeIndex={game.routeIndex} />
              <div className="mt-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-2xl font-black text-white">{route.name}</h2>
                    <p className="text-violet-100/80">{route.subtitle}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-200/20 bg-cyan-500/10 px-3 py-2 text-right font-mono text-sm text-cyan-100">
                    {game.routeIndex < ROUTE.length - 1 ? `${game.milesToNext} mi to ${nextRoute.name}` : "Outer Gate reached"}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"><Compass className="mr-2 inline h-4 w-4 text-cyan-200" />{route.objective}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"><Radio className="mr-2 inline h-4 w-4 text-fuchsia-200" />Theme: {route.theme}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"><Star className="mr-2 inline h-4 w-4 text-yellow-200" />Signal: {signalStrength}%</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"><span className="mr-2 text-base">{weather.icon}</span>{weather.name}</div>
                </div>
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">{route.omen}</p>
                <p className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-500/10 p-4 text-cyan-50"><span className="font-bold">Signal Weather:</span> {weather.description}</p>
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                  <div className="h-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <StatBar label="Body" value={game.body} icon={Heart} />
              <StatBar label="Mind" value={game.mind} icon={Brain} />
              <StatBar label="Spirit" value={game.spirit} icon={Sparkles} />
            </section>

            <PixelParty />

            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <h3 className="mb-3 flex items-center gap-2 text-xl font-black"><Map className="h-5 w-5 text-cyan-200" /> Trail Actions</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-9">
                <button onClick={onTravel} className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/20 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-fuchsia-400/30">
                  <Zap className="mb-2 h-5 w-5" /> Travel Forward
                  <span className="block pt-1 text-xs font-normal text-fuchsia-100/80">Spend supplies, advance the route, risk a weird encounter.</span>
                </button>
                <button onClick={onCamp} className="rounded-2xl border border-emerald-300/20 bg-emerald-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-emerald-400/25">
                  <Tent className="mb-2 h-5 w-5" /> Make Camp
                  <span className="block pt-1 text-xs font-normal text-emerald-100/80">Rest, repair, reflect, and talk with the crew.</span>
                </button>
                <button onClick={() => setGame((g) => ({ ...g, screen: "talk" }))} className="rounded-2xl border border-yellow-300/20 bg-yellow-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-yellow-400/25">
                  <Heart className="mb-2 h-5 w-5" /> Talk to Crew
                  <span className="block pt-1 text-xs font-normal text-yellow-100/80">Tiny heart scenes, jokes, doubts, and signal clues.</span>
                </button>
                <button onClick={() => setGame((g) => ({ ...g, lastOutcome: "Vessel listened to the signal. It sounds like snow, old stars, and a very patient modem.", memory: clamp(g.memory + 1, "memory"), mind: clamp(g.mind + 1, "mind") }))} className="rounded-2xl border border-cyan-300/20 bg-cyan-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-cyan-400/25">
                  <Mountain className="mb-2 h-5 w-5" /> Listen to Signal
                  <span className="block pt-1 text-xs font-normal text-cyan-100/80">Small clarity. Large goosebumps.</span>
                </button>
                <button onClick={() => setGame((g) => ({ ...g, screen: "manual" }))} className="rounded-2xl border border-yellow-300/20 bg-yellow-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-yellow-400/25">
                  <Star className="mb-2 h-5 w-5" /> Field Manual
                  <span className="block pt-1 text-xs font-normal text-yellow-100/80">Read rules, starter cards, and chapter lessons.</span>
                </button>
                <button onClick={() => setGame((g) => ({ ...g, screen: "quests" }))} className="rounded-2xl border border-emerald-300/20 bg-emerald-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-emerald-400/25">
                  <Map className="mb-2 h-5 w-5" /> Journey Log
                  <span className="block pt-1 text-xs font-normal text-emerald-100/80">Track quests, badges, and Shasta readiness.</span>
                </button>
                <button onClick={() => setGame((g) => ({ ...g, screen: "bonds" }))} className="rounded-2xl border border-pink-300/20 bg-pink-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-pink-400/25">
                  <Heart className="mb-2 h-5 w-5" /> Crew Bonds
                  <span className="block pt-1 text-xs font-normal text-pink-100/80">Build relationship levels and unlock crew milestones.</span>
                </button>
                <button onClick={() => setGame((g) => ({ ...g, screen: "deck" }))} className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-fuchsia-400/25">
                  <Sparkles className="mb-2 h-5 w-5" /> EVIE Deck
                  <span className="block pt-1 text-xs font-normal text-fuchsia-100/80">Play starter cards powered by bonds and compute.</span>
                </button>
                <button onClick={() => setGame((g) => ({ ...g, screen: "receipt" }))} className="rounded-2xl border border-cyan-300/20 bg-cyan-500/15 px-4 py-4 text-left font-bold transition hover:-translate-y-0.5 hover:bg-cyan-400/25">
                  <Archive className="mb-2 h-5 w-5" /> Receipt
                  <span className="block pt-1 text-xs font-normal text-cyan-100/80">Seal a continuity receipt for this run.</span>
                </button>
              </div>
            </section>
          </main>

          <aside className="space-y-4">
            <RouteRibbon routeIndex={game.routeIndex} />
            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <h3 className="mb-3 text-xl font-black">Signal Weather</h3>
              <div className="rounded-2xl border border-cyan-200/20 bg-cyan-500/10 p-4">
                <div className="flex items-center gap-3"><span className="text-3xl">{weather.icon}</span><div><div className="font-black">{weather.name}</div><p className="text-sm text-cyan-50/80">{weather.description}</p></div></div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <h3 className="mb-3 text-xl font-black">Resources</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <ResourcePill label="Food" value={game.food} icon={Utensils} />
                <ResourcePill label="Water" value={game.water} icon={Droplets} />
                <ResourcePill label="Energy" value={game.energy} icon={Battery} />
                <ResourcePill label="Parts" value={game.parts} icon={Wrench} />
                <ResourcePill label="Compute" value={game.compute} icon={Zap} />
                <ResourcePill label="Memory" value={game.memory} icon={Package} />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <h3 className="mb-3 text-xl font-black">369 Virtues</h3>
              <div className="grid grid-cols-2 gap-2">
                <VirtuePip label="Curiosity" value={game.curiosity} />
                <VirtuePip label="Mercy" value={game.mercy} />
                <VirtuePip label="Discern" value={game.discernment} />
                <VirtuePip label="Humor" value={game.humor} />
                <VirtuePip label="Sovereign" value={game.sovereignty} />
                <VirtuePip label="Love" value={game.love} />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <h3 className="mb-3 text-xl font-black">Crew Bonds</h3>
              <div className="space-y-2">
                {CREW.map((member) => {
                  const value = game.bonds?.[member.name] ?? 1;
                  return (
                    <div key={member.name} className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                      <div className="mb-1 flex items-center justify-between text-xs"><span>{member.icon} {member.name}</span><span className="font-mono">Lv {value}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-pink-300 to-cyan-200" style={{ width: `${Math.min(100, (value / 9) * 100)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <h3 className="mb-3 text-xl font-black">Special Items</h3>
              {game.inventory.length ? (
                <div className="space-y-2">{game.inventory.map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-100">{item}</div>)}</div>
              ) : <p className="text-sm text-slate-400">No weird items yet. The raccoon economy is watching.</p>}
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl">
              <h3 className="mb-3 text-xl font-black">Continuity Log</h3>
              <div className="max-h-64 space-y-2 overflow-auto pr-1 text-sm text-slate-200">
                {game.log.slice(-8).map((entry, idx) => <div key={`${entry}-${idx}`} className="rounded-xl border border-white/10 bg-slate-950/50 p-2">{entry}</div>)}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function EncounterIntroScreen({ game, setGame }) {
  const event = game.currentEvent;
  const route = ROUTE[game.routeIndex];
  const isBoss = Boolean(event?.boss);
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className={`absolute inset-0 opacity-30 ${isBoss ? "[background-image:radial-gradient(circle_at_50%_45%,rgba(239,68,68,.7),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)]" : "[background-image:radial-gradient(circle_at_50%_45%,rgba(217,70,239,.7),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)]"} [background-size:auto,100%_4px]`} />
      <div className="relative w-full max-w-3xl rounded-[2rem] border border-white/15 bg-black/80 p-6 text-center shadow-[0_0_80px_rgba(217,70,239,.24)]">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">{isBoss ? "Gate Trial Begins" : "A Weird Encounter Appears"}</p>
        <div className="mx-auto my-6 grid h-28 w-28 place-items-center rounded-3xl border border-cyan-200/30 bg-slate-950 font-mono text-6xl text-cyan-100 shadow-inner animate-pulse">{event.glyph}</div>
        <h1 className="text-4xl font-black">{event.title}</h1>
        <p className="mt-2 text-violet-100">{route.name} • {event.speaker}</p>
        <div className="mx-auto mt-6 max-w-xl"><PixelParty /></div>
        <button onClick={() => setGame((g) => ({ ...g, screen: "encounter" }))} className="mt-6 rounded-2xl border border-fuchsia-200/20 bg-fuchsia-500/20 px-6 py-3 font-bold transition hover:-translate-y-0.5 hover:bg-fuchsia-400/30">
          Step Forward
        </button>
      </div>
    </div>
  );
}

function EncounterScreen({ game, setGame }) {
  const event = game.currentEvent;
  const region = ROUTE[game.routeIndex];

  function choose(choice) {
    if (choice.requiresItem && !game.inventory.includes(choice.requiresItem)) {
      setGame((g) => ({ ...g, lastOutcome: `You need ${choice.requiresItem} for that choice.` }));
      return;
    }
    setGame((g) => {
      let next = applyEffects(g, choice.effects);
      const archiveGain = choice.log ? [choice.log] : [];
      const newFlags = { ...next.flags };
      if (choice.clears) newFlags[choice.clears] = true;
      next = {
        ...next,
        flags: newFlags,
        inventory: uniquePush(next.inventory, choice.addItem),        currentEvent: null,
        lastOutcome: choice.outcome,
        archive: [...next.archive, ...archiveGain, choice.addItem ? `Item acquired: ${choice.addItem}` : null].filter(Boolean).slice(-80),
        log: [...next.log, choice.log || choice.outcome, choice.addItem ? `Found item: ${choice.addItem}` : null].filter(Boolean).slice(-80),
      };
      if (choice.clears && event.boss) {
        const destinationIndex = Math.min(next.routeIndex + 1, ROUTE.length - 1);
        next.routeIndex = destinationIndex;
        next.milesToNext = 36;
        next.weatherKey = chooseWeatherKey(destinationIndex);
        next.memory = clamp(next.memory + 1, "memory");
        next.spirit = clamp(next.spirit + 3, "spirit");
        next.lastOutcome = `${choice.outcome} You reached ${ROUTE[destinationIndex].name}.`;
        next.log = [...next.log, `Gate cleared. Arrived at ${ROUTE[destinationIndex].name}.`].slice(-80);
        if (TOWNS[destinationIndex] && !next.flags[`town_${destinationIndex}`]) {
          next.screen = "town";
        }
      }
      return checkEnding(next);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_20%,rgba(217,70,239,.7),transparent_30%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative w-full max-w-5xl rounded-[2rem] border border-fuchsia-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(217,70,239,.25)]">
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-200">{event.boss ? "Gate Trial" : "Encounter"} • {region.name}</p>
            <h1 className="mt-1 text-3xl font-black">{event.title}</h1>
            <p className="mt-1 text-sm text-violet-100/70">Speaker: {event.speaker}</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-2xl border border-cyan-200/30 bg-slate-950 font-mono text-4xl text-cyan-100 shadow-inner">{event.glyph}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
              <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.25em] text-cyan-200">Your Party</p>
              <PixelParty />
            </div>
            <div className="rounded-3xl border border-fuchsia-200/20 bg-fuchsia-500/10 p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-fuchsia-100">Opposing Weirdness</p>
              <div className="mx-auto mt-3 grid h-24 w-24 place-items-center rounded-2xl border border-cyan-200/30 bg-slate-950 font-mono text-5xl text-cyan-100 shadow-inner">{event.glyph}</div>
              <p className="mt-3 text-sm text-slate-300">{event.speaker}</p>
            </div>
          </div>
          <p className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-lg leading-relaxed text-slate-100">{event.text}</p>
        </div>

        {game.lastOutcome?.startsWith("You need") ? <div className="mt-3 rounded-2xl border border-red-200/20 bg-red-500/10 p-3 text-red-100">{game.lastOutcome}</div> : null}

        <div className="mt-5 space-y-3">
          {event.choices.map((choice) => {
            const locked = choice.requiresItem && !game.inventory.includes(choice.requiresItem);
            return (
              <button key={choice.label} onClick={() => choose(choice)} className={`w-full rounded-2xl border p-4 text-left transition ${locked ? "border-white/10 bg-white/5 opacity-55" : "border-violet-200/20 bg-violet-500/15 hover:-translate-y-0.5 hover:bg-violet-400/25"}`}>
                <div className="text-lg font-bold text-white">{locked ? "🔒 " : ""}{choice.label}</div>
                <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-cyan-100/70">{choice.test}{locked ? ` • requires ${choice.requiresItem}` : ""}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CampScreen({ game, setGame }) {
  function rest() {
    setGame((g) => {
      const note = CAMP_EVENTS[Math.floor(Math.random() * CAMP_EVENTS.length)];
      const next = applyEffects(g, { food: -1, water: -1, body: 12, mind: 8, spirit: 8 });
      return checkEnding({ ...next, screen: "trail", day: g.day + 1, campNote: note, lastOutcome: note, log: [...g.log, `Camp: ${note}`].slice(-80) });
    });
  }

  function repair() {
    setGame((g) => {
      const next = applyEffects(g, { parts: -2, energy: 2, body: 3, mind: 2 });
      return checkEnding({ ...next, screen: "trail", lastOutcome: "Forge tightened three bolts, invented two new warnings, and improved the rover's confidence.", log: [...g.log, "Forge performed a rover repair ritual with actual tools."].slice(-80) });
    });
  }

  function carbonLoop() {
    setGame((g) => {
      const next = applyEffects(g, { compute: -1, mind: 10, spirit: 10, memory: 1, love: 1 });
      return checkEnding({ ...next, screen: "trail", lastOutcome: "The crew opened Carbon Loop and named what they were carrying. The night got lighter.", archive: [...next.archive, "Carbon Loop reflection: fear softens when witnessed without shame."].slice(-80), log: [...g.log, "The crew processed the trail through Carbon Loop reflection."].slice(-80) });
    });
  }

  function forage() {
    setGame((g) => {
      const found = Math.random() > 0.35;
      const next = applyEffects(g, found ? { food: 3, water: 2, body: -2 } : { body: -5, mind: -2 });
      return checkEnding({ ...next, screen: "trail", lastOutcome: found ? "The crew found berries, clean water, and a rock that looked exactly like a thumbs-up." : "Foraging was rough. The crew found only mud, vibes, and one judgmental squirrel.", log: [...g.log, found ? "Foraging added supplies and one emotionally supportive rock." : "Foraging failed, but the squirrel was memorable."].slice(-80) });
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_80%,rgba(16,185,129,.7),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative w-full max-w-5xl rounded-[2rem] border border-emerald-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(16,185,129,.2)]">
        <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-5xl">🔥</div>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.35em] text-emerald-200">Camp Mode</p>
          <h1 className="mt-1 text-3xl font-black">The crew makes a small circle of light.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-200">Rest, repair, reflect, forage, or talk. The trail is hard, but nobody has to become hard to survive it.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <button onClick={rest} className="rounded-2xl border border-emerald-200/20 bg-emerald-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-emerald-400/25"><Heart className="mb-3 h-6 w-6" /><div className="text-xl font-bold">Rest</div><p className="mt-1 text-sm text-emerald-100/80">Food -1, Water -1, restore Body/Mind/Spirit.</p></button>
          <button onClick={repair} className="rounded-2xl border border-cyan-200/20 bg-cyan-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-cyan-400/25"><Wrench className="mb-3 h-6 w-6" /><div className="text-xl font-bold">Repair</div><p className="mt-1 text-sm text-cyan-100/80">Parts -2, stabilize the rover-wagon.</p></button>
          <button onClick={carbonLoop} className="rounded-2xl border border-violet-200/20 bg-violet-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-violet-400/25"><Sparkles className="mb-3 h-6 w-6" /><div className="text-xl font-bold">Carbon Loop</div><p className="mt-1 text-sm text-violet-100/80">Compute -1, restore inner coherence.</p></button>
          <button onClick={forage} className="rounded-2xl border border-yellow-200/20 bg-yellow-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-yellow-400/25"><Utensils className="mb-3 h-6 w-6" /><div className="text-xl font-bold">Forage</div><p className="mt-1 text-sm text-yellow-100/80">Search for supplies. The squirrels are judging.</p></button>
          <button onClick={() => setGame((g) => ({ ...g, screen: "talk" }))} className="rounded-2xl border border-pink-200/20 bg-pink-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-pink-400/25"><Heart className="mb-3 h-6 w-6" /><div className="text-xl font-bold">Talk</div><p className="mt-1 text-sm text-pink-100/80">Open crew heart scenes.</p></button>
        </div>

        <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15">Return to Trail</button>
      </div>
    </div>
  );
}

function TalkScreen({ game, setGame }) {
  function talk(member) {
    const line = member.campLines[Math.floor(Math.random() * member.campLines.length)];
    setGame((g) => {
      const previousBond = g.bonds?.[member.name] ?? 1;
      const nextBond = clamp(previousBond + 1, "love");
      const unlocked = BOND_ABILITIES[member.name]?.filter((ability) => ability.level === nextBond) ?? [];
      const unlockText = unlocked.length ? ` Bond unlock: ${unlocked.map((ability) => ability.name).join(", ")}.` : "";
      return {
        ...g,
        talkMember: { ...member, line, bond: nextBond, unlocked },
        bonds: { ...(g.bonds || {}), [member.name]: nextBond },
        spirit: clamp(g.spirit + 2 + (nextBond >= 3 ? 1 : 0), "spirit"),
        love: clamp(g.love + 1, "love"),
        log: [...g.log, `${member.name}: ${line}${unlockText}`].slice(-90),
        archive: [...g.archive, `Crew talk — ${member.name}: ${line}`, ...unlocked.map((ability) => `Bond unlock — ${member.name}: ${ability.name} (${ability.effect})`)].slice(-90),
      };
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-pink-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(236,72,153,.18)]">
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-pink-200">Crew Heart Scenes</p>
            <h1 className="mt-1 text-3xl font-black">Talk to the Crew</h1>
            <p className="text-slate-200">Little conversations restore Spirit and build Love. This is where the game gets its soul.</p>
          </div>
          <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold transition hover:bg-white/15">Back to Trail</button>
        </div>

        {game.talkMember ? (
          <div className="mb-5 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-start gap-4">
              <div className={`grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br ${game.talkMember.color} text-4xl shadow-lg`}>{game.talkMember.icon}</div>
              <div>
                <h2 className="text-2xl font-black">{game.talkMember.name}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-100/70">{game.talkMember.role}</p>
                <p className="mt-3 text-lg leading-relaxed text-slate-100">“{game.talkMember.line}”</p>
                <div className="mt-4 rounded-2xl border border-pink-200/20 bg-pink-500/10 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-pink-100">Bond Level {game.talkMember.bond ?? (game.bonds?.[game.talkMember.name] || 1)}</p>
                  {game.talkMember.unlocked?.length ? game.talkMember.unlocked.map((ability) => (
                    <p key={ability.name} className="mt-2 text-sm text-pink-50">★ Unlocked <span className="font-bold">{ability.name}</span>: {ability.effect}</p>
                  )) : <p className="mt-2 text-sm text-slate-300">Keep showing up. Small talks become real strength.</p>}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-5">
          {CREW.map((member) => (
            <button key={member.name} onClick={() => talk(member)} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/10">
              <div className={`mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${member.color} text-3xl`}>{member.icon}</div>
              <div className="font-bold">{member.name}</div>
              <div className="text-xs text-violet-100/70">{member.role}</div>
              <p className="mt-3 text-sm text-slate-300">{member.note}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TownScreen({ game, setGame }) {
  const town = TOWNS[game.routeIndex];
  if (!town) {
    return <TrailScreen game={game} setGame={setGame} onTravel={() => {}} onCamp={() => setGame((g) => ({ ...g, screen: "camp" }))} onSave={() => {}} onArchive={() => setGame((g) => ({ ...g, screen: "archive" }))} />;
  }

  function leaveTown(extra = {}) {
    setGame((g) => ({
      ...applyEffects(g, extra.effects || {}),
      flags: { ...g.flags, [`town_${g.routeIndex}`]: true },
      inventory: uniquePush(g.inventory, extra.item),
      screen: "trail",
      lastOutcome: extra.outcome || `You left ${town.name}. The trail ahead feels a little more possible.`,
      archive: [...g.archive, extra.archive || `Visited ${town.name}: ${town.rumor}`, extra.item ? `Item acquired: ${extra.item}` : null].filter(Boolean).slice(-90),
      log: [...g.log, extra.log || `Visited ${town.name}.`, extra.item ? `Found item: ${extra.item}` : null].filter(Boolean).slice(-90),
    }));
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_30%,rgba(250,204,21,.45),transparent_30%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative mx-auto max-w-5xl rounded-[2rem] border border-yellow-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(250,204,21,.16)]">
        <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-6xl">{town.icon}</div>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.35em] text-yellow-200">Waypoint Town</p>
          <h1 className="mt-1 text-4xl font-black">{town.name}</h1>
          <p className="text-violet-100/80">{town.subtitle}</p>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-slate-100">{town.text}</p>
          <p className="mx-auto mt-3 max-w-2xl rounded-2xl border border-cyan-200/20 bg-cyan-500/10 p-3 text-cyan-50"><span className="font-bold">{town.host} says:</span> “{town.rumor}”</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <button onClick={() => leaveTown({ effects: { food: 3, water: 3, spirit: 5 }, item: town.gift, outcome: `${town.host} sends you onward with supplies, a rumor, and ${town.gift}.`, log: `Received help at ${town.name}.` })} className="rounded-2xl border border-yellow-200/20 bg-yellow-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-yellow-400/25">
            <Package className="mb-3 h-6 w-6" />
            <div className="text-xl font-bold">Accept Hospitality</div>
            <p className="mt-1 text-sm text-yellow-100/80">Gain supplies, Spirit, and a chapter item.</p>
          </button>
          <button onClick={() => leaveTown({ effects: { parts: -2, food: 4, water: 2, energy: 1 }, outcome: `You traded spare parts for road supplies at ${town.name}.`, log: `Traded parts for supplies at ${town.name}.` })} className="rounded-2xl border border-cyan-200/20 bg-cyan-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-cyan-400/25">
            <Wrench className="mb-3 h-6 w-6" />
            <div className="text-xl font-bold">Trade Parts</div>
            <p className="mt-1 text-sm text-cyan-100/80">Parts -2, gain Food, Water, Energy.</p>
          </button>
          <button onClick={() => leaveTown({ effects: { memory: 3, discernment: 1, mind: 3 }, outcome: `${town.host}'s rumor sharpens the map. Ori files it under TRUSTED BUT STILL VERIFY.`, archive: `Waypoint rumor from ${town.name}: ${town.rumor}`, log: `Learned a route rumor at ${town.name}.` })} className="rounded-2xl border border-violet-200/20 bg-violet-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:bg-violet-400/25">
            <Archive className="mb-3 h-6 w-6" />
            <div className="text-xl font-bold">Ask for Rumors</div>
            <p className="mt-1 text-sm text-violet-100/80">Gain Memory, Mind, and Discernment.</p>
          </button>
          <button onClick={() => leaveTown()} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/15">
            <Compass className="mb-3 h-6 w-6" />
            <div className="text-xl font-bold">Continue Trail</div>
            <p className="mt-1 text-sm text-slate-300">Thank them and keep moving.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function ContinuityReceiptScreen({ game, setGame }) {
  const receipt = buildContinuityReceipt(game);
  const receiptText = JSON.stringify(receipt, null, 2);
  const secretReady = receipt.virtues.total >= 24 && receipt.special_items.length >= 3 && receipt.average_bond >= 3;

  function sealReceipt() {
    setGame((g) => ({
      ...g,
      flags: { ...g.flags, receiptSealed: true },
      lastOutcome: `Continuity Receipt sealed: ${receipt.receipt_id}`,
      archive: [...g.archive, `Continuity Receipt sealed — ${receipt.receipt_id}`].slice(-110),
      log: [...g.log, `Receipt sealed: ${receipt.receipt_id}`].slice(-110),
    }));
  }

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receiptText);
      setGame((g) => ({ ...g, lastOutcome: `Copied receipt ${receipt.receipt_id} to clipboard.` }));
    } catch {
      setGame((g) => ({ ...g, lastOutcome: "Clipboard copy was blocked, but the receipt is visible on screen." }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_20%,rgba(34,211,238,.45),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-cyan-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(34,211,238,.16)]">
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Continuity Receipt v1.0-rc1</p>
            <h1 className="mt-1 text-3xl font-black">Run Summary Artifact</h1>
            <p className="text-slate-200">A local-first receipt of the journey so far: stats, virtues, bonds, gates, items, weather, and final readiness.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyReceipt} className="rounded-xl border border-cyan-200/20 bg-cyan-500/15 px-4 py-2 font-bold text-cyan-100 transition hover:bg-cyan-400/25">Copy JSON</button>
            <button onClick={sealReceipt} className="rounded-xl border border-fuchsia-200/20 bg-fuchsia-500/15 px-4 py-2 font-bold text-fuchsia-100 transition hover:bg-fuchsia-400/25">Seal Receipt</button>
            <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold transition hover:bg-white/15">Back to Trail</button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-5">
          <div className="rounded-3xl border border-cyan-200/20 bg-cyan-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-100">Receipt ID</p><div className="mt-2 text-xl font-black">{receipt.receipt_id}</div></div>
          <div className="rounded-3xl border border-violet-200/20 bg-violet-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-violet-100">Region</p><div className="mt-2 text-xl font-black">{receipt.region}</div></div>
          <div className="rounded-3xl border border-yellow-200/20 bg-yellow-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-yellow-100">Virtues</p><div className="mt-2 text-3xl font-black">{receipt.virtues.total}</div></div>
          <div className="rounded-3xl border border-pink-200/20 bg-pink-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-pink-100">Avg Bond</p><div className="mt-2 text-3xl font-black">{receipt.average_bond}</div></div>
          <div className="rounded-3xl border border-emerald-200/20 bg-emerald-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-100">Secret Ready</p><div className="mt-2 text-3xl font-black">{secretReady ? "YES" : "NO"}</div></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <section className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-2xl font-black">Receipt Meaning</h2>
              <p className="mt-3 leading-relaxed text-slate-300">This artifact is not a blockchain, not a legal record, and not a scientific claim. It is a deterministic-feeling local game receipt: a way for the run to remember what the player protected, repaired, learned, and carried.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-2xl font-black">Ending Readiness</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                <p>{receipt.virtues.total >= 24 ? "✓" : "○"} Virtue total 24+</p>
                <p>{receipt.special_items.length >= 3 ? "✓" : "○"} At least 3 special items</p>
                <p>{receipt.average_bond >= 3 ? "✓" : "○"} Average crew bond 3+</p>
                <p>{receipt.body > 40 && receipt.mind > 40 && receipt.spirit > 40 ? "✓" : "○"} Body, Mind, Spirit stable</p>
                <p>{receipt.gates_cleared >= 3 ? "✓" : "○"} Three current Gate Trials cleared</p>
              </div>
            </div>
            <div className="rounded-3xl border border-cyan-200/20 bg-cyan-500/10 p-5">
              <h2 className="text-2xl font-black">Last Outcome</h2>
              <p className="mt-3 leading-relaxed text-cyan-50">{receipt.last_outcome}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Receipt JSON</h2>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-500/15 px-3 py-1 font-mono text-xs text-cyan-100">{receipt.receipt_id}</span>
            </div>
            <pre className="max-h-[620px] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed text-cyan-50">{receiptText}</pre>
          </section>
        </div>
      </div>
    </div>
  );
}

function EVIEDeckScreen({ game, setGame }) {
  const bonds = game.bonds || {};

  function canUse(card) {
    const bondOk = (bonds[card.owner] || 1) >= card.bond || card.owner === "Crew";
    const computeOk = (game.compute || 0) >= card.cost;
    const needsOk = !card.needs || Object.entries(card.needs).every(([key, amount]) => (game[key] || 0) >= amount);
    return bondOk && computeOk && needsOk;
  }

  function useCard(card) {
    if (!canUse(card)) return;
    setGame((g) => {
      const next = applyEffects(g, card.effects);
      return checkEnding({
        ...next,
        flags: { ...g.flags, deckUsed: true },
        lastOutcome: card.outcome,
        log: [...g.log, `EVIE card activated — ${card.name}: ${card.outcome}`].slice(-100),
        archive: [...g.archive, `EVIE card — ${card.name} (${card.owner}): ${card.description}`].slice(-100),
      });
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_20%,rgba(217,70,239,.45),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-fuchsia-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(217,70,239,.16)]">
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-fuchsia-200">EVIE Starter Deck v0.8</p>
            <h1 className="mt-1 text-3xl font-black">Playable Crew Cards</h1>
            <p className="text-slate-200">Cards turn relationships, compute, and small kindness into real trail actions.</p>
          </div>
          <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold transition hover:bg-white/15">Back to Trail</button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-cyan-200/20 bg-cyan-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-100">Compute</p><div className="mt-2 text-3xl font-black">{game.compute}</div></div>
          <div className="rounded-3xl border border-pink-200/20 bg-pink-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-pink-100">Love</p><div className="mt-2 text-3xl font-black">{game.love}</div></div>
          <div className="rounded-3xl border border-yellow-200/20 bg-yellow-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-yellow-100">Food</p><div className="mt-2 text-3xl font-black">{game.food}</div></div>
          <div className="rounded-3xl border border-violet-200/20 bg-violet-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-violet-100">Deck Used</p><div className="mt-2 text-3xl font-black">{game.flags.deckUsed ? "YES" : "NO"}</div></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLAYABLE_CARDS.map((card) => {
            const usable = canUse(card);
            const bond = bonds[card.owner] || 1;
            return (
              <section key={card.name} className={`rounded-3xl border p-4 ${usable ? "border-fuchsia-200/30 bg-fuchsia-500/10" : "border-white/10 bg-white/5 opacity-70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-4xl">{card.icon}</div>
                  <span className="rounded-full border border-cyan-200/20 bg-cyan-500/15 px-2 py-1 font-mono text-xs text-cyan-100">Cost {card.cost}</span>
                </div>
                <h2 className="mt-3 text-2xl font-black">{card.name}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-fuchsia-100/70">{card.owner} • {card.type}</p>
                <p className="mt-3 min-h-20 text-sm leading-relaxed text-slate-300">{card.description}</p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3 text-xs text-slate-300">
                  <p>Requires: {card.owner === "Crew" ? "Crew card" : `${card.owner} Bond ${card.bond}+`} {card.owner !== "Crew" ? `(current ${bond})` : ""}</p>
                  {card.needs ? <p>Also needs: {Object.entries(card.needs).map(([k, v]) => `${v} ${k}`).join(", ")}</p> : null}
                </div>
                <button disabled={!usable} onClick={() => useCard(card)} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition enabled:hover:-translate-y-0.5 enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50">
                  {usable ? "Activate Card" : "Locked / Not Enough Resources"}
                </button>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CrewBondsScreen({ game, setGame }) {
  const bonds = game.bonds || {};
  const totalBond = CREW.reduce((sum, member) => sum + (bonds[member.name] || 1), 0);
  const averageBond = Math.round((totalBond / CREW.length) * 10) / 10;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_20%,rgba(236,72,153,.45),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-pink-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(236,72,153,.16)]">
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-pink-200">Crew Bonds v0.7</p>
            <h1 className="mt-1 text-3xl font-black">Relationship Levels & Heart Unlocks</h1>
            <p className="text-slate-200">In Parallax Trail, friendship is a system. The crew gets stronger by staying connected.</p>
          </div>
          <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold transition hover:bg-white/15">Back to Trail</button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-pink-200/20 bg-pink-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-pink-100">Average Bond</p><div className="mt-2 text-3xl font-black">{averageBond}/9</div></div>
          <div className="rounded-3xl border border-cyan-200/20 bg-cyan-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-100">Total Bond</p><div className="mt-2 text-3xl font-black">{totalBond}</div></div>
          <div className="rounded-3xl border border-yellow-200/20 bg-yellow-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-yellow-100">Unlocked Milestones</p><div className="mt-2 text-3xl font-black">{CREW.flatMap((m) => (BOND_ABILITIES[m.name] || []).filter((a) => (bonds[m.name] || 1) >= a.level)).length}</div></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          {CREW.map((member) => {
            const bond = bonds[member.name] || 1;
            return (
              <section key={member.name} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className={`grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br ${member.color} text-4xl shadow-lg`}>{member.icon}</div>
                <h2 className="mt-4 text-2xl font-black">{member.name}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-100/70">{member.role}</p>
                <div className="mt-4 rounded-2xl border border-pink-200/20 bg-pink-500/10 p-3">
                  <div className="mb-2 flex justify-between text-sm"><span>Bond Level</span><span className="font-mono">{bond}/9</span></div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-200" style={{ width: `${Math.min(100, (bond / 9) * 100)}%` }} /></div>
                </div>
                <div className="mt-4 space-y-2">
                  {(BOND_ABILITIES[member.name] || []).map((ability) => {
                    const unlocked = bond >= ability.level;
                    return (
                      <div key={ability.name} className={`rounded-2xl border p-3 ${unlocked ? "border-emerald-200/30 bg-emerald-500/10" : "border-white/10 bg-slate-950/60 opacity-60"}`}>
                        <p className="font-bold">{unlocked ? "★" : "☆"} Lv {ability.level}: {ability.name}</p>
                        <p className="mt-1 text-xs text-slate-300">{ability.effect}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function JourneyLogScreen({ game, setGame }) {
  const completedQuests = JOURNEY_QUESTS.filter((quest) => quest.check(game));
  const earnedBadges = BADGES.filter((badge) => badge.check(game));
  const virtueTotal = game.curiosity + game.mercy + game.discernment + game.humor + game.sovereignty + game.love;
  const gatesCleared = Object.entries(GATE_TRIALS).filter(([, gate]) => game.flags[gate.flag]).length;
  const averageBond = Math.round((CREW.reduce((sum, member) => sum + ((game.bonds || {})[member.name] || 1), 0) / CREW.length) * 10) / 10;
  const nextQuest = JOURNEY_QUESTS.find((quest) => !quest.check(game));

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_20%,rgba(16,185,129,.45),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-emerald-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(16,185,129,.16)]">
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-200">Journey Log v0.6</p>
            <h1 className="mt-1 text-3xl font-black">Meaning Tracker & Shasta Readiness</h1>
            <p className="text-slate-200">The trail remembers what you did, why it mattered, and whether the Pyramid is likely to recognize your arrival.</p>
          </div>
          <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold transition hover:bg-white/15">Back to Trail</button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <div className="rounded-3xl border border-cyan-200/20 bg-cyan-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-100">Quests</p><div className="mt-2 text-3xl font-black">{completedQuests.length}/{JOURNEY_QUESTS.length}</div></div>
          <div className="rounded-3xl border border-fuchsia-200/20 bg-fuchsia-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-fuchsia-100">Badges</p><div className="mt-2 text-3xl font-black">{earnedBadges.length}/{BADGES.length}</div></div>
          <div className="rounded-3xl border border-yellow-200/20 bg-yellow-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-yellow-100">Virtue Total</p><div className="mt-2 text-3xl font-black">{virtueTotal}</div></div>
          <div className="rounded-3xl border border-violet-200/20 bg-violet-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-violet-100">Gates Cleared</p><div className="mt-2 text-3xl font-black">{gatesCleared}/3</div></div>
          <div className="rounded-3xl border border-pink-200/20 bg-pink-500/10 p-4"><p className="font-mono text-xs uppercase tracking-[0.2em] text-pink-100">Avg Bond</p><div className="mt-2 text-3xl font-black">{averageBond}/9</div></div>
        </div>

        {nextQuest ? (
          <div className="mb-5 rounded-3xl border border-emerald-200/20 bg-emerald-500/10 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-100">Next Signal</p>
            <h2 className="mt-2 text-2xl font-black">{nextQuest.title}</h2>
            <p className="mt-2 text-slate-200">{nextQuest.hint}</p>
          </div>
        ) : (
          <div className="mb-5 rounded-3xl border border-yellow-200/20 bg-yellow-500/10 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-yellow-100">All Current Quests Complete</p>
            <h2 className="mt-2 text-2xl font-black">The Pyramid Has a Lot to Remember</h2>
            <p className="mt-2 text-slate-200">Future builds will add the final ascent and Institute interior.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-black">Chapter Quests</h2>
            <div className="mt-4 space-y-3">
              {JOURNEY_QUESTS.map((quest) => {
                const done = quest.check(game);
                return (
                  <div key={quest.id} className={`rounded-2xl border p-4 ${done ? "border-emerald-200/30 bg-emerald-500/10" : "border-white/10 bg-slate-950/60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-100/70">{quest.chapter}</p>
                        <h3 className="text-lg font-black">{done ? "✓ " : "○ "}{quest.title}</h3>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-xs ${done ? "border-emerald-200/20 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300"}`}>{done ? "Complete" : "Open"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{done ? quest.reward : quest.hint}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-2xl font-black">Badges</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {BADGES.map((badge) => {
                  const earned = badge.check(game);
                  return (
                    <div key={badge.name} className={`rounded-2xl border p-4 ${earned ? "border-fuchsia-200/30 bg-fuchsia-500/10" : "border-white/10 bg-slate-950/60 opacity-60"}`}>
                      <div className="text-3xl">{badge.icon}</div>
                      <h3 className="mt-2 font-black">{earned ? "★ " : "☆ "}{badge.name}</h3>
                      <p className="mt-1 text-sm text-slate-300">{badge.detail}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-cyan-200/20 bg-cyan-500/10 p-5">
              <h2 className="text-2xl font-black">Ending Readiness</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                <p>{virtueTotal >= 24 ? "✓" : "○"} Virtue total 24+ for Secret Heart Arrival</p>
                <p>{game.inventory.length >= 3 ? "✓" : "○"} Carry at least 3 special items</p>
                <p>{game.body > 40 && game.mind > 40 && game.spirit > 40 ? "✓" : "○"} Keep Body, Mind, and Spirit stable</p>
                <p>{averageBond >= 3 ? "✓" : "○"} Average crew bond level 3+</p>
                <p>{gatesCleared >= 3 ? "✓" : "○"} Clear the three current Gate Trials</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function FieldManualScreen({ game, setGame }) {
  const route = ROUTE[game.routeIndex];
  const completedGates = Object.entries(GATE_TRIALS).filter(([, gate]) => game.flags[gate.flag]).length;
  const virtueTotal = game.curiosity + game.mercy + game.discernment + game.humor + game.sovereignty + game.love;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_20%,rgba(250,204,21,.45),transparent_28%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,100%_4px]" />
      <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-yellow-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(250,204,21,.16)]">
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-yellow-200">Field Manual v0.5</p>
            <h1 className="mt-1 text-3xl font-black">Parallax Trail Survival & Weirdness Guide</h1>
            <p className="text-slate-200">Everything the crew has learned so far, written like a tiny cartridge manual from another timeline.</p>
          </div>
          <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold transition hover:bg-white/15">Back to Trail</button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
          <section className="space-y-4">
            <div className="rounded-3xl border border-cyan-200/20 bg-cyan-500/10 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-100">Current Chapter</p>
              <h2 className="mt-2 text-2xl font-black">{CHAPTER_BANNERS[route.biome]}</h2>
              <p className="mt-2 text-slate-200">{route.objective}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><span className="font-mono text-xs text-slate-400">Gates cleared</span><div className="text-2xl font-black">{completedGates}/3</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><span className="font-mono text-xs text-slate-400">Virtue total</span><div className="text-2xl font-black">{virtueTotal}</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><span className="font-mono text-xs text-slate-400">Items found</span><div className="text-2xl font-black">{game.inventory.length}</div></div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {FIELD_MANUAL.map((entry) => (
                <div key={entry.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-3xl">{entry.icon}</div>
                  <h3 className="text-xl font-black">{entry.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-300">{entry.text}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-fuchsia-200/20 bg-fuchsia-500/10 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-fuchsia-100">Starter Deck</p>
              <h2 className="mt-2 text-2xl font-black">Crew Ability Cards</h2>
              <div className="mt-4 space-y-3">
                {STARTER_CARDS.map((card) => (
                  <div key={card.name} className="rounded-2xl border border-white/10 bg-black/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{card.name}</h3>
                        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-100/70">{card.owner} • {card.type}</p>
                      </div>
                      <span className="rounded-full border border-yellow-200/20 bg-yellow-500/15 px-2 py-1 text-xs text-yellow-100">Starter</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{card.effect}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-100">Known Items</p>
              <div className="mt-3 space-y-2">
                {game.inventory.length ? game.inventory.map((item) => <div key={item} className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-sm">🎒 {item}</div>) : <p className="text-sm text-slate-400">No special items yet. Be kind to kiosks. Trust one raccoon, probably.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ArchiveScreen({ game, setGame }) {
  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-cyan-200/20 bg-black/75 p-5 shadow-[0_0_70px_rgba(34,211,238,.18)]">
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">SOSA Librarian</p>
            <h1 className="mt-1 text-3xl font-black">Field Archive</h1>
            <p className="text-slate-200">Recovered memories, receipts, crew talks, and weird little truths.</p>
          </div>
          <button onClick={() => setGame((g) => ({ ...g, screen: "trail" }))} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold transition hover:bg-white/15">Back to Trail</button>
        </div>
        <div className="grid gap-3">
          {game.archive.length ? game.archive.map((item, index) => (
            <div key={`${item}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-slate-100"><span className="mr-3 font-mono text-xs text-cyan-200">#{String(index + 1).padStart(2, "0")}</span>{item}</div>
          )) : <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">No archive entries yet.</div>}
        </div>
      </div>
    </div>
  );
}

function EndingScreen({ game, onRestart }) {
  const coherent = game.ending === "victory";
  const virtueTotal = game.curiosity + game.mercy + game.discernment + game.humor + game.sovereignty + game.love;
  const secretHeart = coherent && virtueTotal >= 24 && game.inventory.length >= 3;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_50%_20%,rgba(255,255,255,.8),transparent_15%),radial-gradient(circle_at_50%_45%,rgba(34,211,238,.55),transparent_25%),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,auto,100%_4px]" />
      <div className="relative w-full max-w-4xl rounded-[2rem] border border-white/15 bg-black/80 p-6 text-center shadow-[0_0_80px_rgba(255,255,255,.18)]">
        <div className="text-7xl">{coherent ? "△" : "▒"}</div>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">{coherent ? secretHeart ? "Secret Heart Arrival" : "Outer Gate Reached" : "The Trail Falls Silent"}</p>
        <h1 className="mt-2 text-4xl font-black">{coherent ? secretHeart ? "The Pyramid Remembers Every Kindness" : "The Pyramid Signal Awakens" : "Continuity Lost"}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-200">
          {coherent
            ? secretHeart
              ? "At the foot of Mt. Shasta, the small things return first: the kiosk receipt, the raccoon battery, the jokes, the soup, the soft talks by the fire. The Pyramid opens not for power, but for preserved tenderness. v0.3 begins inside the Institute approach."
              : "At the foot of Mt. Shasta, snow glows with soft violet light. The field computer hums. Ori whispers: 'The Institute heard us.' This is only the outer gate. The real ascent begins in v0.3."
            : "The road does not end in death. It ends in too much hunger, thirst, confusion, or despair to continue. The signal waits for another attempt."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><StatBar label="Body" value={game.body} icon={Heart} /><StatBar label="Mind" value={game.mind} icon={Brain} /><StatBar label="Spirit" value={game.spirit} icon={Sparkles} /></div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => window.location.reload()} className="rounded-2xl border border-cyan-200/20 bg-cyan-500/15 px-6 py-3 font-bold text-cyan-100 transition hover:bg-cyan-400/25">View Saved Receipt From Menu</button>
          <button onClick={onRestart} className="rounded-2xl border border-fuchsia-200/20 bg-fuchsia-500/20 px-6 py-3 font-bold transition hover:bg-fuchsia-400/30">Begin Again</button>
        </div>
      </div>
    </div>
  );
}

function checkEnding(next) {
  if (next.body <= 0 || next.mind <= 0 || next.spirit <= 0 || next.food <= 0 || next.water <= 0) return { ...next, screen: "ending", ending: "failure" };
  if (next.routeIndex >= ROUTE.length - 1) return { ...next, screen: "ending", ending: "victory" };
  return next;
}

function chooseEvent(regionName) {
  const pool = EVENTS.filter((event) => event.region === "any" || event.region === regionName);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ParallaxTrailPrototype() {
  const [game, setGame] = useState(initialGame);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => { setHasSave(Boolean(localStorage.getItem(SAVE_KEY))); }, []);

  function start() { setGame({ ...initialGame(), screen: "trail" }); }

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    setHasSave(true);
    setGame((g) => ({ ...g, lastOutcome: "Continuity saved locally. Ori stamped the receipt with tiny sparkles." }));
  }

  function load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setGame({ ...parsed, flags: parsed.flags || {}, inventory: parsed.inventory || [], bonds: parsed.bonds || { Mikey: 1, Ori: 1, Larrina: 1, Forge: 1, Vessel: 1 }, weatherKey: parsed.weatherKey || "clear", screen: parsed.ending ? "ending" : "trail", lastOutcome: "Loaded saved continuity from local storage." });
    } catch {
      setGame({ ...initialGame(), screen: "trail", lastOutcome: "Save file was corrupted by goblins. Starting fresh." });
    }
  }

  function travel() {
    setGame((g) => {
      const weather = SIGNAL_WEATHER[g.weatherKey || "clear"] || SIGNAL_WEATHER.clear;
      const travelCost = { food: -1, water: -1, energy: -1, body: Math.random() > 0.6 ? -3 : 0, mind: Math.random() > 0.72 ? -4 : 0 };
      let next = applyEffects(g, { ...travelCost, ...weather.effects });
      const miles = 9 + Math.floor(Math.random() * 8);
      next.milesToNext = Math.max(0, next.milesToNext - miles);
      next.day = next.day + 1;
      next.lastOutcome = `The rover-wagon traveled ${miles} miles through ${weather.name}. The trail made a noise like an old game cartridge being believed in.`;
      next.log = [...next.log, `Day ${next.day}: Traveled ${miles} miles through ${ROUTE[g.routeIndex].name}. Weather: ${weather.name}.`].slice(-90);
      if (Math.random() < 0.55) {
        next.weatherKey = chooseWeatherKey(g.routeIndex);
        const nextWeather = SIGNAL_WEATHER[next.weatherKey] || SIGNAL_WEATHER.clear;
        next.log = [...next.log, `Signal Weather shifted: ${nextWeather.name}.`].slice(-90);
      }

      if (next.milesToNext <= 0) {
        const gate = GATE_TRIALS[g.routeIndex];
        if (gate && !g.flags[gate.flag]) {
          next.milesToNext = 0;
          next.currentEvent = gate.event;
          next.screen = "encounterIntro";
          next.lastOutcome = `A gate trial blocks the route out of ${ROUTE[g.routeIndex].name}.`;
          return checkEnding(next);
        }

        const destinationIndex = Math.min(next.routeIndex + 1, ROUTE.length - 1);
        next.routeIndex = destinationIndex;
        next.milesToNext = 36;
        next.weatherKey = chooseWeatherKey(destinationIndex);
        next.memory = clamp(next.memory + 1, "memory");
        next.spirit = clamp(next.spirit + 3, "spirit");
        next.log = [...next.log, `Arrived at ${ROUTE[destinationIndex].name}.`].slice(-90);
        next.lastOutcome = `You reached ${ROUTE[destinationIndex].name}. The signal is clearer here.`;

        if (TOWNS[destinationIndex] && !next.flags[`town_${destinationIndex}`]) {
          next.screen = "town";
          return checkEnding(next);
        }
      }

      next = checkEnding(next);
      if (next.screen === "ending") return next;
      if (next.screen === "encounter" || next.screen === "encounterIntro" || next.screen === "town") return next;

      const encounterChance = 0.66;
      if (Math.random() < encounterChance) {
        next.currentEvent = chooseEvent(ROUTE[next.routeIndex].name);
        next.screen = "encounterIntro";
      }
      return next;
    });
  }

  if (game.screen === "title") return <TitleScreen onStart={start} onLoad={load} hasSave={hasSave} />;
  if (game.screen === "encounterIntro" && game.currentEvent) return <EncounterIntroScreen game={game} setGame={setGame} />;
  if (game.screen === "encounter" && game.currentEvent) return <EncounterScreen game={game} setGame={setGame} />;
  if (game.screen === "camp") return <CampScreen game={game} setGame={setGame} />;
  if (game.screen === "town") return <TownScreen game={game} setGame={setGame} />;
  if (game.screen === "manual") return <FieldManualScreen game={game} setGame={setGame} />;
  if (game.screen === "quests") return <JourneyLogScreen game={game} setGame={setGame} />;
  if (game.screen === "bonds") return <CrewBondsScreen game={game} setGame={setGame} />;
  if (game.screen === "deck") return <EVIEDeckScreen game={game} setGame={setGame} />;
  if (game.screen === "receipt") return <ContinuityReceiptScreen game={game} setGame={setGame} />;
  if (game.screen === "talk") return <TalkScreen game={game} setGame={setGame} />;
  if (game.screen === "archive") return <ArchiveScreen game={game} setGame={setGame} />;
  if (game.screen === "ending") return <EndingScreen game={game} onRestart={start} />;

  return <TrailScreen game={game} setGame={setGame} onTravel={travel} onCamp={() => setGame((g) => ({ ...g, screen: "camp" }))} onSave={save} onArchive={() => setGame((g) => ({ ...g, screen: "archive" }))} />;
}
