// Vaultbreaker: Midnight Heist — the renderer.
// Canvas 2D, no assets: the room, raycast vision cones, loot, guards,
// cameras, the thief, the HUD (loot, alarm meter, lives, coins, timer)
// and the title / pause / clear / busted / win screens. The canvas fits
// the 960 x 664 logical frame (64 px HUD strip + 960 x 600 room) into the
// window, letterboxed, at device pixel ratio.
import { FIELD } from './config.js';

export const HUD_HEIGHT = 64;
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const TOTAL_W = FIELD.width;
const TOTAL_H = FIELD.height + HUD_HEIGHT;
const CONE_RAYS = 26;

// Distance along a ray before it hits a wall rectangle (or the room edge).
function rayWallDist(ox, oy, dx, dy, maxDist, walls) {
  let best = maxDist;
  // Room edges.
  if (dx > 0) best = Math.min(best, (FIELD.width - ox) / dx);
  else if (dx < 0) best = Math.min(best, -ox / dx);
  if (dy > 0) best = Math.min(best, (FIELD.height - oy) / dy);
  else if (dy < 0) best = Math.min(best, -oy / dy);
  for (const w of walls) {
    let tmin = 0;
    let tmax = best;
    if (dx === 0) {
      if (ox < w.x || ox > w.x + w.w) continue;
    } else {
      let t1 = (w.x - ox) / dx;
      let t2 = (w.x + w.w - ox) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (dy === 0) {
      if (oy < w.y || oy > w.y + w.h) continue;
    } else {
      let t1 = (w.y - oy) / dy;
      let t2 = (w.y + w.h - oy) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (tmin < best) best = tmin;
  }
  return Math.max(0, best);
}

function drawCone(ctx, viewer, range, halfAngle, walls, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(viewer.x, viewer.y);
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const a = viewer.angle - halfAngle + (2 * halfAngle * i) / CONE_RAYS;
    const d = rayWallDist(viewer.x, viewer.y, Math.cos(a), Math.sin(a), range, walls);
    ctx.lineTo(viewer.x + Math.cos(a) * d, viewer.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLootIcon(ctx, item, time) {
  const pulse = item.target ? 0.6 + 0.4 * Math.sin(time * 4) : 1;
  ctx.save();
  ctx.translate(item.x, item.y);
  if (item.target) {
    ctx.beginPath();
    ctx.arc(0, 0, 24 + 3 * Math.sin(time * 4), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.55 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, -26);
  }
  if (item.kind === 'painting') {
    ctx.fillStyle = '#8a6d3b';
    ctx.fillRect(-14, -11, 28, 22);
    ctx.fillStyle = '#7fb069';
    ctx.fillRect(-11, -8, 22, 16);
    ctx.fillStyle = '#e9c46a';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.kind === 'vase') {
    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.ellipse(0, 2, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-4, -14, 8, 6);
  } else if (item.kind === 'gold') {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-14, 2, 12, 8);
    ctx.fillRect(-2, 2, 12, 8);
    ctx.fillRect(-8, -7, 12, 8);
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1;
    ctx.strokeRect(-14, 2, 12, 8);
    ctx.strokeRect(-2, 2, 12, 8);
    ctx.strokeRect(-8, -7, 12, 8);
  } else if (item.kind === 'diamond') {
    ctx.fillStyle = '#7df9ff';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e0ffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (item.kind === 'jewels') {
    ctx.fillStyle = '#e63946';
    for (const [gx, gy] of [[-8, 4], [0, -4], [8, 4]]) {
      ctx.beginPath();
      ctx.arc(gx, gy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item.kind === 'crown') {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(-13, 8);
    ctx.lineTo(-13, -6);
    ctx.lineTo(-6, 0);
    ctx.lineTo(0, -11);
    ctx.lineTo(6, 0);
    ctx.lineTo(13, -6);
    ctx.lineTo(13, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(0, 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(w / TOTAL_W, h / TOTAL_H);
    offsetX = (w - TOTAL_W * scale) / 2;
    offsetY = (h - TOTAL_H * scale) / 2;
    return dpr;
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale - HUD_HEIGHT;
    return { x, y };
  }

  function draw(state, screen, best, time) {
    const dpr = resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);

    drawHud(state, screen, best);
    ctx.save();
    ctx.translate(0, HUD_HEIGHT);
    drawRoom(state, time);
    ctx.restore();

    // Alarm vignette: the room edges bleed red as the alarm climbs.
    if (state.alarm > 25 && screen === SCREEN_PLAY) {
      const a = ((state.alarm - 25) / 75) * 0.4;
      const grad = ctx.createRadialGradient(
        TOTAL_W / 2, TOTAL_H / 2, TOTAL_H * 0.3,
        TOTAL_W / 2, TOTAL_H / 2, TOTAL_H * 0.75,
      );
      grad.addColorStop(0, 'rgba(255,0,0,0)');
      grad.addColorStop(1, `rgba(255,0,0,${a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);
    }

    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPanel('PAUSED', 'Press P or Esc to keep stealing', state, best);
    else if (screen === SCREEN_CLEAR) drawClear(state, best);
    else if (screen === SCREEN_OVER) drawPanel('BUSTED!', `The guards got you.  Score $${state.score}  ·  Best $${best}`, state, best, 'Press Enter to try again');
    else if (screen === SCREEN_WIN) drawWin(state, best);
  }

  function drawHud(state, screen, best) {
    ctx.fillStyle = '#0d1017';
    ctx.fillRect(0, 0, TOTAL_W, HUD_HEIGHT);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(0, HUD_HEIGHT - 2, TOTAL_W, 2);
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LOOT  $${state.score.toLocaleString()}`, 14, 22);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#9aa3b2';
    ctx.fillText(state.level ? state.level.name : '', 14, 46);

    // Alarm meter.
    ctx.textAlign = 'left';
    ctx.fillStyle = state.alarm > 70 ? '#ff5252' : '#e8e8e8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('ALARM', 300, 18);
    const barX = 300;
    const barY = 28;
    const barW = 220;
    const barH = 16;
    ctx.fillStyle = '#222835';
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();
    const frac = state.alarm / 100;
    const hue = frac < 0.5 ? '#43a047' : frac < 0.75 ? '#fdd835' : '#e53935';
    if (frac > 0) {
      ctx.fillStyle = hue;
      roundRect(ctx, barX, barY, Math.max(8, barW * frac), barH, 4);
      ctx.fill();
    }
    ctx.strokeStyle = state.alarm > 70 && Math.floor(Date.now() / 300) % 2 === 0 ? '#ff5252' : '#3a4152';
    ctx.lineWidth = 1.5;
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.stroke();

    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    ctx.fillText(`TIME ${mins}:${String(secs).padStart(2, '0')}`, TOTAL_W - 14, 22);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#9aa3b2';
    ctx.fillText(`LIVES ${'●'.repeat(Math.max(0, state.lives))}${'○'.repeat(Math.max(0, 3 - state.lives))}   COINS ${state.coins}   BEST $${best.toLocaleString()}`, TOTAL_W - 14, 46);

    // Toast message under the HUD.
    if (state.messageTimer > 0 && state.message && screen === SCREEN_PLAY) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = 'rgba(5, 7, 12, 0.75)';
      const w = ctx.measureText(state.message).width + 28;
      roundRect(ctx, TOTAL_W / 2 - w / 2, HUD_HEIGHT + 10, w, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.fillText(state.message, TOTAL_W / 2, HUD_HEIGHT + 25);
    }
  }

  function drawRoom(state, time) {
    const level = state.level;
    // Floor: quiet checkerboard.
    for (let ty = 0; ty < FIELD.height / 60; ty += 1) {
      for (let tx = 0; tx < FIELD.width / 60; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#171b26' : '#1a1f2d';
        ctx.fillRect(tx * 60, ty * 60, 60, 60);
      }
    }
    // Room border.
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, FIELD.width - 3, FIELD.height - 3);

    // Exit door.
    const e = level.exit;
    const open = state.exitOpen;
    ctx.fillStyle = open ? '#1b5e20' : '#3d1a1a';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = open ? '#69f0ae' : '#e53935';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = open ? '#69f0ae' : '#ff8a80';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2);
    if (open) {
      ctx.fillStyle = `rgba(105, 240, 174, ${0.25 + 0.2 * Math.sin(time * 5)})`;
      ctx.fillRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
    }

    // Walls / display cases.
    for (const w of level.walls) {
      ctx.fillStyle = '#3a4152';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#4a5266';
      ctx.fillRect(w.x, w.y, w.w, 5);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
    }

    // Vault safe.
    if (state.vault) {
      const v = state.vault;
      ctx.fillStyle = '#2d3442';
      roundRect(ctx, v.x - 42, v.y - 26, 84, 52, 6);
      ctx.fill();
      ctx.strokeStyle = v.cracked ? '#69f0ae' : '#c9a227';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(v.x, v.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d3442';
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e8e8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(v.cracked ? 'OPEN' : 'VAULT — hold E', v.x, v.y + 40);
      if (state.vaultProgress > 0 && !v.cracked) {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.vaultProgress);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }

    // Loot.
    for (const item of state.loot) {
      if (!item.taken) drawLootIcon(ctx, item, time);
    }

    // Coin ping rings.
    if (state.coinPing) {
      const r = 14 + (1.4 - state.coinPing.timer) * 40;
      ctx.beginPath();
      ctx.arc(state.coinPing.x, state.coinPing.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${state.coinPing.timer})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(state.coinPing.x, state.coinPing.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vision cones: guards amber, cameras red, clipped by walls.
    for (const g of state.guards) {
      drawCone(ctx, g, 175, 0.61, level.walls,
        g.mode === 'chase' ? 'rgba(255, 82, 82, 0.30)' : 'rgba(255, 193, 7, 0.20)',
        g.mode === 'chase' ? 'rgba(255, 82, 82, 0.55)' : 'rgba(255, 193, 7, 0.4)');
    }
    for (const c of state.cameras) {
      drawCone(ctx, c, 205, 0.5, level.walls, 'rgba(229, 57, 53, 0.18)', 'rgba(229, 57, 53, 0.45)');
    }

    // Cameras on the wall.
    for (const c of state.cameras) {
      ctx.fillStyle = '#222835';
      ctx.fillRect(c.x - 9, c.y - 7, 18, 14);
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c.x - 9, c.y - 7, 18, 14);
      ctx.fillStyle = Math.floor(Date.now() / 500) % 2 === 0 ? '#ff5252' : '#7a1010';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Guards.
    for (const g of state.guards) {
      ctx.fillStyle = '#2b3a67';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c8cc4';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick (flashlight).
      ctx.strokeStyle = '#ffe082';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
      ctx.stroke();
      // Eyes.
      ctx.fillStyle = '#fff';
      const ex = Math.cos(g.angle);
      const ey = Math.sin(g.angle);
      ctx.beginPath();
      ctx.arc(g.x + ex * 5 - ey * 4, g.y + ey * 5 + ex * 4, 2, 0, Math.PI * 2);
      ctx.arc(g.x + ex * 5 + ey * 4, g.y + ey * 5 - ex * 4, 2, 0, Math.PI * 2);
      ctx.fill();
      if (g.mode === 'chase') {
        ctx.fillStyle = '#ff5252';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - 20);
      } else if (g.mode === 'investigate') {
        ctx.fillStyle = '#ffd54f';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', g.x, g.y - 20);
      }
    }

    // The thief.
    const p = state.player;
    if (p.sneak) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 19, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#101014';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Mask band + direction tick.
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(p.x - 8, p.y - 3, 16, 5);
    ctx.fillStyle = '#101014';
    ctx.beginPath();
    ctx.arc(p.x - 4, p.y - 0.5, 1.6, 0, Math.PI * 2);
    ctx.arc(p.x + 4, p.y - 0.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 17, p.y + Math.sin(p.angle) * 17);
    ctx.stroke();
  }

  function dim() {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
    ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);
  }

  function panel(title, lines, accent = '#ffd700') {
    dim();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(title, TOTAL_W / 2, TOTAL_H / 2 - 90);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '18px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, TOTAL_W / 2, TOTAL_H / 2 - 30 + i * 30);
    });
  }

  function drawTitle(state, best) {
    panel('VAULTBREAKER', [], '#ffd700');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9a227';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('— MIDNIGHT HEIST —', TOTAL_W / 2, TOTAL_H / 2 - 48);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '16px sans-serif';
    const lines = [
      'Cross the room. Dodge the guards’ amber cones and the cameras’ red sweeps.',
      'Grab the loot — the ★ target opens the exit. Hold E at the vault to crack it.',
      'Click to toss a coin and lure a guard away. Shift sneaks, slower but harder to spot.',
      'If the ALARM meter fills, you are busted. Three lives. Three rooms. One clean getaway.',
      '',
      'Move: WASD / arrows   ·   Sneak: Shift   ·   Crack vault: hold E   ·   Coin: click',
      'Pause: P   ·   Mute: M   ·   Restart: R',
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, TOTAL_W / 2, TOTAL_H / 2 - 6 + i * 26);
    });
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px sans-serif';
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) ctx.fillText('Press ENTER or click to start', TOTAL_W / 2, TOTAL_H / 2 + 176);
    ctx.fillStyle = '#9aa3b2';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Best score  $${best.toLocaleString()}`, TOTAL_W / 2, TOTAL_H / 2 + 206);
  }

  function drawPanel(title, subtitle, state, best, hint = 'Press Enter to continue') {
    panel(title, [subtitle, '', hint], '#ff5252');
  }

  function drawClear(state, best) {
    const bonus = Math.max(0, 500 - Math.floor(state.time) * 5);
    panel('LEVEL CLEAR!', [
      `${state.level.name} — loot $${state.levelScore.toLocaleString()} (time bonus $${bonus})`,
      `Total score  $${state.score.toLocaleString()}  ·  Best  $${best.toLocaleString()}`,
      '',
      'Press Enter for the next room',
    ], '#69f0ae');
  }

  function drawWin(state, best) {
    const rank = state.score >= 9000 ? 'LEGEND OF THE NIGHT'
      : state.score >= 6000 ? 'MASTER THIEF'
      : state.score >= 3000 ? 'SMOOTH OPERATOR' : 'SMALL-TIME SNEAK';
    panel('THE PERFECT HEIST!', [
      `All three rooms cleaned out. Final score  $${state.score.toLocaleString()}`,
      `Rank: ${rank}  ·  Best  $${best.toLocaleString()}`,
      '',
      'Press Enter to steal again',
    ], '#ffd700');
  }

  return { draw, resize, screenToWorld };
}
