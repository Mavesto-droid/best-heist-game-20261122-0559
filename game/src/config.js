// Vaultbreaker: Midnight Heist — tuning constants.
// A top-down stealth heist: cross the room, dodge guard and camera vision
// cones, grab the loot, crack the vault, and slip out the exit before the
// alarm meter fills. All values are in logical pixels / seconds.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'vaultbreaker-best-score';

export const PLAYER = {
  radius: 13,
  speed: 175, // px/s walking
  sneakSpeed: 96, // px/s while Shift is held
  grabRadius: 30, // how close loot must be to pick it up
  vaultRadius: 46, // how close the vault must be to crack it
  vaultSeconds: 2.0, // hold E this long to crack the vault
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 148,
  investigateSpeed: 95,
  viewRange: 175, // how far a guard can see
  viewHalfAngle: 0.61, // ~35 degrees each side of facing
  spotRate: 52, // alarm points per second while the thief is seen
  spotRateSneak: 26, // ...while the thief sneaks
  chaseMemory: 2.5, // seconds of lost sight before giving up the chase
  touchCatch: 26, // px: closer than this and the guard grabs the thief
};

export const CAMERA = {
  viewRange: 205,
  viewHalfAngle: 0.5, // ~29 degrees each side of the lens axis
  spotRate: 36, // alarm points per second while the thief is on camera
  spotRateSneak: 18,
  sweepSpeed: 0.45, // radians per second of the lens sweep
};

export const ALARM = {
  decay: 7, // points per second while nobody sees the thief
  max: 100,
};

export const GAME = {
  lives: 3,
  coinsPerLevel: 3, // coins to toss as distractions
  coinLureRadius: 280, // guards inside this hear the coin land
  timeBonusMax: 500, // bonus points for a fast level
  timeBonusPerSecond: 5,
};
