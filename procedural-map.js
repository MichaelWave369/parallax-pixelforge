// Deterministic, dependency-free map generation for PixelForge Tile Studio.
// Generated output uses the existing v5.10 ground/decor/collision layer contract.
export const PROCEDURAL_MODES = ['dungeon', 'cavern', 'forest'];

function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const choose = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const at = (x, y, width) => y * width + x;

export function pathExists(layers, width, height, entrance, exit) {
  if (!layers || !Array.isArray(layers.collision) || layers.collision.length !== width * height) return false;
  const inside = ({x, y}) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < width && y >= 0 && y < height;
  if (!entrance || !exit || !inside(entrance) || !inside(exit)) return false;
  const start = at(entrance.x, entrance.y, width);
  const end = at(exit.x, exit.y, width);
  if (layers.collision[start] || layers.collision[end]) return false;
  const visited = new Uint8Array(width * height);
  const queue = [start];
  visited[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === end) return true;
    const x = current % width, y = Math.floor(current / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = at(nx, ny, width);
      if (visited[next] || layers.collision[next]) continue;
      visited[next] = 1;
      queue.push(next);
    }
  }
  return false;
}

function makeTerrain(width, height, mode, rng) {
  const cells = width * height;
  const terrain = new Array(cells).fill(1); // 0 floor, 1 wall/tree, 2 path, 3 water
  const inside = (x, y) => x > 0 && y > 0 && x < width - 1 && y < height - 1;
  const carve = (x, y, kind = 2) => {
    if (inside(x, y)) terrain[at(x, y, width)] = kind;
  };
  const tunnel = (a, b) => {
    let x = a.x, y = a.y;
    const horizontalFirst = rng() > 0.5;
    const walkX = () => { while (x !== b.x) { carve(x, y); x += Math.sign(b.x - x); } carve(x, y); };
    const walkY = () => { while (y !== b.y) { carve(x, y); y += Math.sign(b.y - y); } carve(x, y); };
    if (horizontalFirst) { walkX(); walkY(); } else { walkY(); walkX(); }
  };
  const entrance = {x: 1, y: 1};
  const exit = {x: width - 2, y: height - 2};

  if (mode === 'dungeon') {
    const rooms = [];
    const target = Math.max(4, Math.floor(cells / 100));
    for (let n = 0; n < target * 5 && rooms.length < target; n++) {
      const rw = choose(rng, 3, Math.min(width - 2, 9));
      const rh = choose(rng, 3, Math.min(height - 2, 7));
      const rx = choose(rng, 1, width - rw - 1);
      const ry = choose(rng, 1, height - rh - 1);
      if (rooms.some(r => rx <= r.x + r.w && rx + rw >= r.x && ry <= r.y + r.h && ry + rh >= r.y)) continue;
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) carve(x, y, 0);
      rooms.push({x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2)});
    }
    const centers = rooms.map(r => ({x: r.cx, y: r.cy}));
    const route = [entrance, ...centers, exit];
    for (let i = 1; i < route.length; i++) tunnel(route[i - 1], route[i]);
  } else if (mode === 'cavern') {
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++) carve(x, y, rng() < 0.44 ? 1 : 0);
    for (let pass = 0; pass < 4; pass++) {
      const next = terrain.slice();
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const px = x + dx, py = y + dy;
          if (!inside(px, py) || terrain[at(px, py, width)] === 1) walls++;
        }
        next[at(x, y, width)] = walls >= 5 ? 1 : 0;
      }
      terrain.splice(0, terrain.length, ...next);
    }
    const bend = {x: choose(rng, 2, width - 3), y: choose(rng, 2, height - 3)};
    tunnel(entrance, bend);
    tunnel(bend, exit);
  } else {
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++)
      carve(x, y, rng() < 0.22 ? 1 : 0);
    // Small water pockets, kept away from the outer boundary.
    for (let n = 0; n < Math.max(1, Math.floor(cells / 220)); n++) {
      const cx = choose(rng, 2, width - 3), cy = choose(rng, 2, height - 3);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (inside(cx + dx, cy + dy) && rng() < 0.7) carve(cx + dx, cy + dy, 3);
      }
    }
    let previous = entrance;
    for (let x = 3; x < width - 2; x += 4) {
      const next = {x, y: choose(rng, 1, height - 2)};
      tunnel(previous, next);
      previous = next;
    }
    tunnel(previous, exit);
  }

  // Explicitly clear both staging areas. The final route always uses 4-way movement.
  for (const p of [entrance, exit]) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) carve(p.x + dx, p.y + dy, 2);
  }
  tunnel(entrance, exit); // Defensive connectivity guarantee, even on tiny valid maps.
  return {terrain, entrance, exit};
}

function roleIndex(tiles, role, fallback = 0) {
  const found = tiles.findIndex(tile => tile.tag === role);
  return found < 0 ? fallback : found;
}

export function generateProceduralMap({width, height, seed, mode = 'dungeon', tiles}) {
  if (!Number.isInteger(width) || width < 8 || width > 64 ||
      !Number.isInteger(height) || height < 8 || height > 48)
    throw new RangeError('Procedural maps must be 8–64 cells wide and 8–48 cells tall.');
  if (!PROCEDURAL_MODES.includes(mode)) throw new RangeError('Unknown procedural map mode.');
  if (!Array.isArray(tiles) || !tiles.length || tiles.length > 128)
    throw new TypeError('A PixelForge tileset with 1–128 tiles is required.');
  const cleanSeed = String(seed ?? '').trim().slice(0, 80);
  if (!cleanSeed) throw new TypeError('A nonempty seed is required.');
  const rng = seededRandom(mode + ':' + cleanSeed + ':' + width + 'x' + height);
  const {terrain, entrance, exit} = makeTerrain(width, height, mode, rng);
  const ground = roleIndex(tiles, 'ground');
  const path = roleIndex(tiles, 'path', ground);
  const wall = roleIndex(tiles, 'wall', ground);
  const foliage = roleIndex(tiles, 'foliage', wall);
  const water = roleIndex(tiles, 'water', wall);
  const decorTile = roleIndex(tiles, 'decor', -1);
  const layers = {ground: [], decor: [], collision: []};
  for (let i = 0; i < terrain.length; i++) {
    const t = terrain[i];
    layers.ground.push(t === 1 ? (mode === 'forest' ? foliage : wall) : t === 3 ? water : t === 2 ? path : ground);
    layers.collision.push(t === 1 || t === 3);
    layers.decor.push(decorTile >= 0 && t === 0 && rng() < 0.045 ? decorTile : null);
  }
  const reachable = pathExists(layers, width, height, entrance, exit);
  if (!reachable) throw new Error('Generator failed to connect its entrance and exit.');
  const blocked = layers.collision.filter(Boolean).length;
  return {
    layers,
    metadata: {
      schema: 'pixelforge.procedural-map.v1', mode, seed: cleanSeed, width, height,
      entrance, exit, reachable, walkableCells: width * height - blocked, blockedCells: blocked
    }
  };
}

export function buildProceduralStarterTiles() {
  const specs = [
    ['Meadow Ground', 'ground', true, '#407c4c', '#64a969'],
    ['Footpath', 'path', true, '#aa8b57', '#d3b47b'],
    ['Stone Wall', 'wall', false, '#46536b', '#75829a'],
    ['Water', 'water', false, '#1d5285', '#4d95cf'],
    ['Forest Canopy', 'foliage', false, '#205233', '#498e47'],
    ['Wildflowers', 'decor', true, null, '#e6c477']
  ];
  return specs.map(([name, tag, walkable, base, accent], index) => {
    const rng = seededRandom('pixel-art:' + tag);
    const pixels = Array.from({length: 256}, (_, i) => {
      const x = i % 16, y = Math.floor(i / 16);
      if (tag === 'decor') return rng() < 0.065 ? accent : null;
      if (tag === 'water') return y % 4 === 1 && x % 5 !== 0 ? accent : base;
      if (tag === 'wall') return (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 4) % 8 === 0) ? accent : base;
      if (tag === 'foliage') return x === 0 || y === 0 || x === 15 || y === 15 ? base : rng() < 0.45 ? accent : base;
      return rng() < 0.18 ? accent : base;
    });
    return {id: 'tile_proc_' + tag, name, tag, walkable, autotileGroup: '', pixels};
  });
}
