// Vaultbreaker: Midnight Heist — the screenshot scenes behind
// ?shot=start|play|end. Each one plays the real rules forward from a fresh
// world with a fixed seed, steered by a simple autopilot (head for the
// nearest loot, wait when a vision cone covers the next step, run from a
// chasing guard), so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { GUARD, CAMERA, STEP } from './config.js';
import { canSee, EVENT_CLEAR, EVENT_WIN } from './world.js';
import { SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 22;
const END_LIMIT_SECONDS = 300;
const SAMPLE = STEP;

/** Would standing at (x, y) be seen by any guard or camera right now? */
function wouldBeSeen(state, x, y) {
  const point = { x, y };
  for (const g of state.guards) {
    if (canSee(g, point, GUARD.viewRange, GUARD.viewHalfAngle, state.level.walls)) return true;
  }
  for (const c of state.cameras) {
    if (canSee(c, point, CAMERA.viewRange, CAMERA.viewHalfAngle, state.level.walls)) return true;
  }
  return false;
}

/** Every eye in the room, guards and cameras alike. */
function viewers(state) {
  const list = state.guards.map((g) => ({ x: g.x, y: g.y }));
  for (const c of state.cameras) list.push({ x: c.x, y: c.y });
  return list;
}

/** Would a circle of radius 14 at (x, y) be stuck in a wall or outside? */
function pointBlocked(state, x, y) {
  if (x < 14 || x > 960 - 14 || y < 14 || y > 600 - 14) return true;
  for (const w of state.level.walls) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < 14 * 14) return true;
  }
  return false;
}

const DIRS8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/**
 * Get out of sight: of the eight directions, take the step that is not
 * seen and puts the most distance between the thief and every eye; if
 * every step is seen, take the one furthest from the nearest eye.
 */
function escapeMove(state) {
  const p = state.player;
  const eyes = viewers(state);
  let best = null;
  let bestScore = -Infinity;
  for (const [dx, dy] of DIRS8) {
    const len = Math.hypot(dx, dy);
    const nx = p.x + (dx / len) * 30;
    const ny = p.y + (dy / len) * 30;
    if (pointBlocked(state, nx, ny)) continue;
    let minD = Infinity;
    for (const v of eyes) minD = Math.min(minD, Math.hypot(v.x - nx, v.y - ny));
    const score = (wouldBeSeen(state, nx, ny) ? -1000 : 0) + minD;
    if (score > bestScore) {
      bestScore = score;
      best = { mx: dx / len, my: dy / len };
    }
  }
  if (!best) return { mx: 0, my: 0, sneak: true, interact: false, coin: null };
  return { mx: best.mx, my: best.my, sneak: false, interact: false, coin: null };
}

/** Greedy autopilot: nearest loot, then the exit; wait out vision cones. */
export function autopilot(state) {
  const p = state.player;
  // Seen, or chased: get out of sight first, loot second.
  const chased = state.guards.some((g) => g.mode === 'chase');
  if (chased || wouldBeSeen(state, p.x, p.y)) return escapeMove(state);
  let goal = null;
  if (!state.exitOpen) {
    let bestDist = Infinity;
    for (const item of state.loot) {
      if (item.taken) continue;
      const d = Math.hypot(item.x - p.x, item.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        goal = item;
      }
    }
    if (state.vault && !state.vault.cracked) {
      const d = Math.hypot(state.vault.x - p.x, state.vault.y - p.y);
      if (goal === null || d < bestDist) goal = state.vault;
    }
  } else {
    goal = { x: state.level.exit.x + state.level.exit.w / 2, y: state.level.exit.y + state.level.exit.h / 2 };
  }
  if (!goal) return { mx: 0, my: 0, sneak: false, interact: false, coin: null };
  const dx = goal.x - p.x;
  const dy = goal.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  // Pilot memory: where the thief was last step, how long it has been
  // stuck, and any wall-follow detour in progress.
  const mem = state._pilot || (state._pilot = { lx: p.x, ly: p.y, stuck: 0, detourT: 0, detourX: 0, detourY: 0 });
  // Wait if the next step walks into a cone — or sidestep around it.
  const nx = p.x + (dx / len) * 24;
  const ny = p.y + (dy / len) * 24;
  if (wouldBeSeen(state, nx, ny)) {
    mem.stuck = 0; // waiting for a cone is a choice, not being stuck
    // A sidestep keeps the heist moving while the cone sweeps past.
    for (const s of [1, -1]) {
      const sx = p.x + (-dy / len) * s * 24;
      const sy = p.y + (dx / len) * s * 24;
      if (!pointBlocked(state, sx, sy) && !wouldBeSeen(state, sx, sy)) {
        mem.wait = 0;
        return { mx: (-dy / len) * s, my: (dx / len) * s, sneak: true, interact: false, coin: null };
      }
    }
    // Waiting forever helps no one: if the cone never clears (a guard
    // parked on the route), back off and come at it from another angle —
    // or spend a coin: toss it behind the thief so the guard walks over
    // to check the noise and the route clears.
    mem.wait = (mem.wait || 0) + STEP;
    if (mem.wait > 2.5) {
      mem.wait = 0;
      if (state.coins > 0 && !state.coinPing && !mem.coined) {
        mem.coined = true;
        // Land the coin 180 px behind the thief, away from the goal.
        const coin = {
          x: Math.max(30, Math.min(930, p.x - (dx / len) * 180)),
          y: Math.max(30, Math.min(570, p.y - (dy / len) * 180)),
        };
        return { mx: 0, my: 0, sneak: true, interact: false, coin };
      }
      return escapeMove(state);
    }
    return { mx: 0, my: 0, sneak: true, interact: false, coin: null };
  }
  mem.wait = 0;
  mem.coined = false;
  // Wall-follow: if the thief is pushing into a wall (goal straight ahead
  // behind a display case) and barely moving, sidestep around it for a
  // moment instead of standing there until a guard strolls by.
  const moved = Math.hypot(p.x - mem.lx, p.y - mem.ly);
  if (moved < 2) mem.stuck += STEP;
  else mem.stuck = 0;
  mem.lx = p.x;
  mem.ly = p.y;
  if (mem.detourT > 0) {
    mem.detourT -= STEP;
    return { mx: mem.detourX, my: mem.detourY, sneak: false, interact: false, coin: null };
  }
  if (mem.stuck > 0.8) {
    mem.stuck = 0;
    mem.detourT = 1.1;
    mem.detourX = 0;
    mem.detourY = 0;
    for (const s of [1, -1]) {
      const sx = p.x + (-dy / len) * s * 30;
      const sy = p.y + (dx / len) * s * 30;
      if (!pointBlocked(state, sx, sy) && !wouldBeSeen(state, sx, sy)) {
        mem.detourX = (-dy / len) * s;
        mem.detourY = (dx / len) * s;
        break;
      }
    }
    if (mem.detourX === 0 && mem.detourY === 0) {
      mem.detourX = -dy / len;
      mem.detourY = dx / len;
    }
    return { mx: mem.detourX, my: mem.detourY, sneak: false, interact: false, coin: null };
  }
  const nearVault = state.vault && !state.vault.cracked
    && Math.hypot(state.vault.x - p.x, state.vault.y - p.y) < 46;
  return { mx: dx / len, my: dy / len, sneak: false, interact: nearVault, coin: null };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { mx: 0, my: 0, sneak: false, interact: false, coin: null }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(state), true);
      if (events & (EVENT_CLEAR | EVENT_WIN)) break;
    }
    // Stage a mid-alert moment so the alarm meter reads part-full.
    if (state.alarm < 25) state.alarm = 32;
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // end: play level 1 to a real win; force it only if the pilot stalls.
  let won = false;
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const events = world.step(STEP, autopilot(state), true);
    if (events & (EVENT_CLEAR | EVENT_WIN)) {
      won = true;
      break;
    }
    if (events & 2) break; // caught: fall through to the staged finish
  }
  if (!won) {
    for (const item of state.loot) {
      if (!item.taken) {
        item.taken = true;
        state.score += item.value;
        state.levelScore += item.value;
      }
    }
    state.targetTaken = true;
    state.exitOpen = true;
    const e = state.level.exit;
    state.player.x = e.x + e.w / 2;
    state.player.y = e.y + e.h / 2;
    const bonus = Math.max(0, 500 - Math.floor(state.time) * 5);
    state.score += bonus;
    state.levelScore += bonus;
    state.cleared = true;
  }
  return { screen: SCREEN_CLEAR, best: state.score };
}
