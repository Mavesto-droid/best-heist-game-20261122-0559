// Vaultbreaker: Midnight Heist — the three rooms.
// Every room is data: wall blocks (display cases, desks, pillars), guard
// patrol loops, wall cameras that sweep, loot to grab, the vault safe, the
// thief's start and the exit door. The exit only opens once the room's
// starred target loot is taken. Coordinates are logical pixels in a
// 960 x 600 room; the outer walls are the room's edges.
export const LEVELS = [
  {
    name: 'Level 1 — The Gallery',
    hint: 'Grab the ★ diamond, then slip out the top-right door.',
    start: { x: 60, y: 540 },
    exit: { x: 880, y: 24, w: 56, h: 30 },
    walls: [
      { x: 180, y: 120, w: 90, h: 50 },
      { x: 480, y: 110, w: 90, h: 50 },
      { x: 700, y: 300, w: 90, h: 50 },
      { x: 200, y: 380, w: 90, h: 50 },
      { x: 500, y: 430, w: 120, h: 50 },
      { x: 430, y: 250, w: 40, h: 40 },
    ],
    guards: [
      { waypoints: [[300, 200], [650, 200]], pause: 1.2 },
      { waypoints: [[780, 150], [780, 450]], pause: 1.0 },
    ],
    cameras: [
      { x: 480, y: 10, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.45 },
    ],
    loot: [
      { x: 230, y: 88, kind: 'painting', value: 500, label: 'Painting' },
      { x: 450, y: 78, kind: 'vase', value: 400, label: 'Vase' },
      { x: 860, y: 320, kind: 'gold', value: 800, label: 'Gold bars' },
      { x: 640, y: 520, kind: 'diamond', value: 1500, label: 'Star Diamond', target: true },
    ],
    vault: null,
  },
  {
    name: 'Level 2 — The Vault Floor',
    hint: 'Hold E at the vault to crack it, then reach the bottom-right door.',
    start: { x: 60, y: 60 },
    exit: { x: 880, y: 546, w: 56, h: 30 },
    walls: [
      { x: 200, y: 140, w: 110, h: 46 },
      { x: 560, y: 140, w: 110, h: 46 },
      { x: 380, y: 280, w: 200, h: 46 },
      { x: 150, y: 400, w: 100, h: 46 },
      { x: 700, y: 400, w: 100, h: 46 },
    ],
    guards: [
      { waypoints: [[250, 230], [700, 230]], pause: 1.0 },
      { waypoints: [[120, 260], [120, 500]], pause: 1.2 },
      { waypoints: [[350, 520], [800, 520]], pause: 0.8 },
    ],
    cameras: [
      { x: 130, y: 10, baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.5 },
      { x: 830, y: 10, baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.4 },
    ],
    loot: [
      { x: 150, y: 90, kind: 'painting', value: 600, label: 'Portrait' },
      { x: 830, y: 110, kind: 'gold', value: 900, label: 'Gold bars' },
      { x: 860, y: 500, kind: 'jewels', value: 1000, label: 'Jewels' },
      { x: 150, y: 500, kind: 'vase', value: 500, label: 'Vase' },
    ],
    vault: { x: 480, y: 96, value: 2500, label: 'Vault safe' },
  },
  {
    name: 'Level 3 — The Getaway',
    hint: 'Take the ★ Crown Jewels and escape through the roof door.',
    start: { x: 60, y: 540 },
    exit: { x: 452, y: 16, w: 56, h: 30 },
    walls: [
      { x: 170, y: 150, w: 90, h: 46 },
      { x: 700, y: 150, w: 90, h: 46 },
      { x: 170, y: 400, w: 90, h: 46 },
      { x: 700, y: 400, w: 90, h: 46 },
      { x: 430, y: 200, w: 100, h: 40 },
      { x: 430, y: 360, w: 100, h: 40 },
    ],
    guards: [
      { waypoints: [[200, 280], [760, 280]], pause: 0.8 },
      { waypoints: [[200, 470], [760, 470]], pause: 0.8 },
      { waypoints: [[200, 120], [200, 480]], pause: 1.0 },
      { waypoints: [[760, 120], [760, 480]], pause: 1.0 },
    ],
    cameras: [
      { x: 250, y: 10, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55 },
      { x: 710, y: 10, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.45 },
      { x: 480, y: 590, baseAngle: -Math.PI / 2, sweep: 0.9, speed: 0.5 },
    ],
    loot: [
      { x: 120, y: 90, kind: 'gold', value: 900, label: 'Gold bars' },
      { x: 840, y: 90, kind: 'painting', value: 700, label: 'Painting' },
      { x: 120, y: 510, kind: 'jewels', value: 1100, label: 'Jewels' },
      { x: 840, y: 510, kind: 'vase', value: 600, label: 'Vase' },
      { x: 480, y: 330, kind: 'crown', value: 3000, label: 'Crown Jewels', target: true },
    ],
    vault: null,
  },
];
