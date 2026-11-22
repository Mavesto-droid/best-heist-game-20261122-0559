// Vaultbreaker: Midnight Heist — the simulation.
// One fixed-step world: the thief, patrolling guards with vision cones,
// sweeping cameras, loot, the vault safe, coins to toss, and the alarm
// meter. Guards chase what they see; cameras only raise the alarm; the
// alarm fills while the thief is seen and drains while hidden. Get the
// starred target loot, then reach the exit.
import { ALARM, CAMERA, FIELD, GAME, GUARD, PLAYER, STEP } from './config.js';
import { LEVELS } from './levels.js';

export const EVENT_PICKUP = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_VAULT = 16;
export const EVENT_COIN = 32;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Does the segment (x1,y1)-(x2,y2) cross the rectangle? (line-of-sight test)
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function blockedByWall(x, y, radius, walls) {
  if (x - radius < 0 || x + radius > FIELD.width || y - radius < 0 || y + radius > FIELD.height) return true;
  for (const w of walls) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius) return true;
  }
  return false;
}

// Move a circle one axis at a time so it slides along walls instead of sticking.
function moveCircle(body, dx, dy, radius, walls) {
  const nx = body.x + dx;
  if (!blockedByWall(nx, body.y, radius, walls)) body.x = nx;
  const ny = body.y + dy;
  if (!blockedByWall(body.x, ny, radius, walls)) body.y = ny;
}

// Move a guard toward a point. A guard pushing straight into a wall corner
// (its goal directly behind a display case) slides along the wall instead,
// taking the side that ends closer to the goal, so patrols never wedge.
function moveGuard(g, tx, ty, speed, dt, walls) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const ox = g.x;
  const oy = g.y;
  moveCircle(g, (dx / d) * speed * dt, (dy / d) * speed * dt, GUARD.radius, walls);
  if (Math.hypot(g.x - ox, g.y - oy) > 0.5) {
    g.slide = 0; // moving freely again: forget any wall-follow side
    return;
  }
  // Wedged against a wall corner: keep sliding along the wall on one side
  // until the direct path clears (re-deciding every step by distance
  // ties and pins the guard in place, so the side persists).
  const px = -dy / d;
  const py = dx / d;
  if (!g.slide) g.slide = 1;
  for (let tries = 0; tries < 2; tries += 1) {
    const cx = g.x + px * g.slide * speed * dt;
    const cy = g.y + py * g.slide * speed * dt;
    if (!blockedByWall(cx, cy, GUARD.radius, walls)) {
      g.x = cx;
      g.y = cy;
      return;
    }
    g.slide = -g.slide; // that side is shut: try the other way around
  }
  g.slide = 0;
}

function losClear(x1, y1, x2, y2, walls) {
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  }
  return true;
}

export function canSee(viewer, target, range, halfAngle, walls) {
  const d = dist(viewer.x, viewer.y, target.x, target.y);
  if (d > range) return false;
  const ang = Math.atan2(target.y - viewer.y, target.x - viewer.x);
  if (Math.abs(angleDiff(ang, viewer.angle)) > halfAngle) return false;
  return losClear(viewer.x, viewer.y, target.x, target.y, walls);
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: null,
    player: { x: 60, y: 540, angle: -Math.PI / 2, sneak: false, moving: false },
    guards: [],
    cameras: [],
    loot: [],
    vault: null,
    vaultProgress: 0,
    alarm: 0,
    score: 0,
    levelScore: 0,
    lives: GAME.lives,
    coins: GAME.coinsPerLevel,
    coinPing: null,
    time: 0,
    targetTaken: false,
    exitOpen: false,
    message: '',
    messageTimer: 0,
    caught: false,
    cleared: false,
  };

  function loadLevel(index) {
    const def = LEVELS[index];
    state.levelIndex = index;
    state.level = def;
    state.player.x = def.start.x;
    state.player.y = def.start.y;
    state.player.angle = -Math.PI / 2;
    state.guards = def.guards.map((g) => ({
      x: g.waypoints[0][0],
      y: g.waypoints[0][1],
      angle: 0,
      waypoints: g.waypoints,
      waypointIndex: 1 % g.waypoints.length,
      pause: g.pause,
      pauseTimer: 0,
      mode: 'patrol',
      lastSeen: null,
      lostTimer: 0,
      target: null,
    }));
    state.cameras = def.cameras.map((c) => ({
      x: c.x,
      y: c.y,
      baseAngle: c.baseAngle,
      sweep: c.sweep,
      speed: c.speed,
      angle: c.baseAngle,
      phase: random() * Math.PI * 2,
    }));
    state.loot = def.loot.map((l) => ({ ...l, taken: false }));
    state.vault = def.vault ? { ...def.vault, cracked: false } : null;
    state.vaultProgress = 0;
    state.alarm = 0;
    state.levelScore = 0;
    state.coins = GAME.coinsPerLevel;
    state.coinPing = null;
    state.time = 0;
    state.targetTaken = false;
    state.exitOpen = false;
    state.caught = false;
    state.cleared = false;
    state.message = def.hint;
    state.messageTimer = 4;
  }

  function say(text, seconds = 3) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function reset() {
    state.score = 0;
    state.lives = GAME.lives;
    loadLevel(0);
  }

  function nextLevel() {
    loadLevel(state.levelIndex + 1);
  }

  // input: { mx, my, sneak, interact, coin: {x, y} | null }
  // mx/my: -1..1 movement; coin: a click point in world coordinates.
  function step(dt, input, silent = false) {
    let events = 0;
    if (state.caught || state.cleared) return events;
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    const p = state.player;
    const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.speed;
    p.sneak = input.sneak;
    const len = Math.hypot(input.mx, input.my);
    p.moving = len > 0.01;
    if (p.moving) {
      const nx = input.mx / (len || 1);
      const ny = input.my / (len || 1);
      p.angle = Math.atan2(ny, nx);
      moveCircle(p, nx * speed * dt, ny * speed * dt, PLAYER.radius, state.level.walls);
    }

    // Toss a coin: every guard close enough to hear it walks over to look.
    if (input.coin && state.coins > 0) {
      state.coins -= 1;
      state.coinPing = { x: input.coin.x, y: input.coin.y, timer: 1.4 };
      for (const g of state.guards) {
        if (g.mode !== 'chase' && dist(g.x, g.y, input.coin.x, input.coin.y) < GAME.coinLureRadius) {
          g.mode = 'investigate';
          g.target = { x: input.coin.x, y: input.coin.y };
        }
      }
      events |= EVENT_COIN;
      if (!silent) say('Clink! A guard goes to check the noise…');
    }
    if (state.coinPing) {
      state.coinPing.timer -= dt;
      if (state.coinPing.timer <= 0) state.coinPing = null;
    }

    // Pick up loot by walking over it.
    for (const item of state.loot) {
      if (item.taken) continue;
      if (dist(p.x, p.y, item.x, item.y) < PLAYER.grabRadius) {
        item.taken = true;
        state.score += item.value;
        state.levelScore += item.value;
        events |= EVENT_PICKUP;
        if (item.target) {
          state.targetTaken = true;
          state.exitOpen = true;
          say(`★ ${item.label} secured! Get to the exit!`, 4);
        } else {
          say(`+ $${item.value} — ${item.label}`);
        }
      }
    }

    // Crack the vault: stand close and hold E.
    if (state.vault && !state.vault.cracked) {
      if (dist(p.x, p.y, state.vault.x, state.vault.y) < PLAYER.vaultRadius && input.interact) {
        state.vaultProgress += dt / PLAYER.vaultSeconds;
        if (state.vaultProgress >= 1) {
          state.vault.cracked = true;
          state.score += state.vault.value;
          state.levelScore += state.vault.value;
          state.targetTaken = true;
          state.exitOpen = true;
          events |= EVENT_VAULT;
          say(`★ Vault cracked — $${state.vault.value}! Get to the exit!`, 4);
        }
      } else {
        state.vaultProgress = Math.max(0, state.vaultProgress - dt * 1.5);
      }
    }

    // Cameras sweep back and forth.
    for (const c of state.cameras) {
      c.phase += c.speed * dt;
      c.angle = c.baseAngle + Math.sin(c.phase) * c.sweep;
    }

    // Detection: guards and cameras raise the alarm while they see the thief.
    let seen = false;
    for (const g of state.guards) {
      if (canSee(g, p, GUARD.viewRange, GUARD.viewHalfAngle, state.level.walls)) {
        seen = true;
        g.mode = 'chase';
        g.lastSeen = { x: p.x, y: p.y };
        g.lostTimer = 0;
        state.alarm += (p.sneak ? GUARD.spotRateSneak : GUARD.spotRate) * dt;
      }
    }
    for (const c of state.cameras) {
      if (canSee(c, p, CAMERA.viewRange, CAMERA.viewHalfAngle, state.level.walls)) {
        seen = true;
        state.alarm += (p.sneak ? CAMERA.spotRateSneak : CAMERA.spotRate) * dt;
      }
    }
    if (!seen) state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    if (state.alarm > 35 && state.alarm < 100 && !state._warned) {
      state._warned = true;
      say('They saw you — break line of sight!');
    }
    if (state.alarm < 20) state._warned = false;

    // Guard movement and behaviour.
    for (const g of state.guards) {
      if (g.mode === 'chase') {
        const target = g.lastSeen;
        const d = dist(g.x, g.y, target.x, target.y);
        if (d > 4) {
          const vx = (target.x - g.x) / d;
          const vy = (target.y - g.y) / d;
          g.angle = Math.atan2(vy, vx);
          moveGuard(g, target.x, target.y, GUARD.chaseSpeed, dt, state.level.walls);
        }
        // Lost sight: count down, then go and check where the thief was.
        if (!canSee(g, p, GUARD.viewRange, GUARD.viewHalfAngle, state.level.walls)) {
          g.lostTimer += dt;
          if (g.lostTimer > GUARD.chaseMemory) {
            g.mode = 'investigate';
            g.target = { x: target.x, y: target.y };
          }
        } else {
          g.lostTimer = 0;
        }
        if (dist(g.x, g.y, p.x, p.y) < GUARD.touchCatch) {
          state.caught = true;
          events |= EVENT_CAUGHT;
          return events;
        }
      } else if (g.mode === 'investigate') {
        const t = g.target;
        const d = dist(g.x, g.y, t.x, t.y);
        if (d > 6) {
          const vx = (t.x - g.x) / d;
          const vy = (t.y - g.y) / d;
          g.angle = Math.atan2(vy, vx);
          moveGuard(g, t.x, t.y, GUARD.investigateSpeed, dt, state.level.walls);
        } else {
          g.mode = 'patrol';
          g.pauseTimer = g.pause;
        }
      } else {
        // Patrol: walk the waypoint loop, pausing and looking around at each stop.
        if (g.pauseTimer > 0) {
          g.pauseTimer -= dt;
          g.angle += dt * 0.9; // glance around while waiting
        } else {
          const wp = g.waypoints[g.waypointIndex];
          const d = dist(g.x, g.y, wp[0], wp[1]);
          if (d < 6) {
            g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
            g.pauseTimer = g.pause;
          } else {
            const vx = (wp[0] - g.x) / d;
            const vy = (wp[1] - g.y) / d;
            g.angle = Math.atan2(vy, vx);
            moveGuard(g, wp[0], wp[1], GUARD.patrolSpeed, dt, state.level.walls);
          }
        }
      }
    }

    if (state.alarm >= ALARM.max) {
      state.alarm = ALARM.max;
      state.caught = true;
      events |= EVENT_CAUGHT;
      return events;
    }

    // Exit: only open once the target loot is taken.
    if (state.exitOpen) {
      const e = state.level.exit;
      if (p.x > e.x - 6 && p.x < e.x + e.w + 6 && p.y > e.y - 6 && p.y < e.y + e.h + 6) {
        const bonus = Math.max(0, GAME.timeBonusMax - Math.floor(state.time) * GAME.timeBonusPerSecond);
        state.score += bonus;
        state.levelScore += bonus;
        state.cleared = true;
        if (state.levelIndex >= LEVELS.length - 1) events |= EVENT_WIN;
        else events |= EVENT_CLEAR;
        return events;
      }
    }
    return events;
  }

  loadLevel(0);
  return { state, reset, loadLevel, nextLevel, step, say };
}
