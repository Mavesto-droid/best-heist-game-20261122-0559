// Vaultbreaker: Midnight Heist — boot and the one loop.
// Input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between six screens: title, play, paused,
// level clear, busted and the final win.
//
// ?seed=N fixes the patrols and loot. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CLEAR, EVENT_COIN, EVENT_PICKUP, EVENT_VAULT, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, onAction, (x, y) => renderer.screenToWorld(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let alarmSoundTimer = 0;

  // Screen readers (and anyone watching the page's text) hear the changes.
  function announce(message) {
    status.textContent = message;
  }

  function onAction(action) {
    audio.unlock();
    if (action === ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
      return;
    }
    if (action === ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      world.loadLevel(world.state.levelIndex);
      screen = SCREEN_PLAY;
      announce('Room restarted.');
      return;
    }
    if (action === ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (action === ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE) {
        world.reset();
        screen = SCREEN_PLAY;
        announce('Playing. Grab the starred loot, then reach the exit.');
      } else if (screen === SCREEN_CLEAR) {
        world.nextLevel();
        screen = SCREEN_PLAY;
        announce(`Playing. ${world.state.level.name}.`);
      } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
        world.reset();
        screen = SCREEN_PLAY;
        announce('Playing. Grab the starred loot, then reach the exit.');
      }
    }
  }

  function handleEvents(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_VAULT) audio.vault();
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_CAUGHT) {
      audio.caught();
      world.state.lives -= 1;
      if (world.state.lives > 0) {
        announce(`Caught! ${world.state.lives} ${world.state.lives === 1 ? 'life' : 'lives'} left.`);
        world.loadLevel(world.state.levelIndex);
      } else {
        screen = SCREEN_OVER;
        if (world.state.score > best) {
          best = world.state.score;
          saveBest(best);
        }
        announce(`Busted. Score ${world.state.score}. Best ${best}.`);
      }
    }
    if (events & EVENT_CLEAR) {
      audio.clear();
      screen = SCREEN_CLEAR;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`Level clear. Score ${world.state.score}.`);
    }
    if (events & EVENT_WIN) {
      audio.clear();
      screen = SCREEN_WIN;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`The perfect heist! Final score ${world.state.score}.`);
    }
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const inputState = input.read();
    // A click outside play is a confirm (start / next room / retry).
    if (inputState.coin && screen !== SCREEN_PLAY) {
      onAction(ACTION_CONFIRM);
      inputState.coin = null;
    }
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, inputState, false);
        inputState.coin = null; // one toss per click
        handleEvents(events);
        if (screen !== SCREEN_PLAY) break;
      }
      // Alarm warning pulse while the meter runs hot.
      if (world.state.alarm > 70) {
        alarmSoundTimer -= elapsed;
        if (alarmSoundTimer <= 0) {
          audio.alarm();
          alarmSoundTimer = 0.9;
        }
      }
    }
    renderer.draw(world.state, screen, best, now / 1000);
    requestAnimationFrame(frame);
  }

  announce('Vaultbreaker: Midnight Heist. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
