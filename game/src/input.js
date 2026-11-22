// Vaultbreaker: Midnight Heist — keyboard and mouse input.
// WASD / arrows move, Shift sneaks, E (hold) cracks the vault, click tosses
// a coin to distract guards, P or Esc pauses, M mutes, Enter confirms.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function createInput(canvas, onAction, mapPoint) {
  const keys = new Set();
  let click = null; // {x, y} in world coordinates, consumed once

  function toWorld(clientX, clientY) {
    if (mapPoint) return mapPoint(clientX, clientY);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function onKeyDown(event) {
    if (event.code === 'Enter' || event.code === 'Space') {
      onAction(ACTION_CONFIRM);
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') {
      onAction(ACTION_PAUSE);
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyM') {
      onAction(ACTION_MUTE);
      return;
    }
    if (event.code === 'KeyR') {
      onAction(ACTION_RESTART);
      return;
    }
    if (MOVE_KEYS[event.code] || event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyE') {
      keys.add(event.code);
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseDown(event) {
    click = toWorld(event.clientX, event.clientY);
    event.preventDefault();
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    click = toWorld(touch.clientX, touch.clientY);
    event.preventDefault();
  }, { passive: false });

  // The movement vector this frame, in world (canvas) coordinates.
  function read() {
    let mx = 0;
    let my = 0;
    for (const code of keys) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        mx += dir[0];
        my += dir[1];
      }
    }
    const sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const interact = keys.has('KeyE');
    const coin = click;
    click = null;
    return { mx, my, sneak, interact, coin };
  }

  return { read };
}
