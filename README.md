# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Mavesto-droid/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Mavesto-droid/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Vaultbreaker: Midnight Heist** — a top-down stealth heist game for the desktop browser. Cross three museum rooms, dodge patrolling guards with amber vision cones and sweeping red security cameras, grab the loot (the starred target opens the exit), crack the vault safe, and slip out before the alarm meter fills. Toss coins to lure guards away, sneak with Shift when a cone sweeps your way, and don't get caught — three lives, three rooms, one clean getaway.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — plain static files (`game/index.html` + ES modules) with synthesized WebAudio sounds.

## How to play

- **Move:** WASD / arrow keys
- **Sneak:** hold Shift (slower, harder to spot)
- **Crack the vault:** stand by the safe and hold E
- **Distract a guard:** click to toss a coin (3 per room)
- **Pause:** P or Esc · **Mute:** M · **Restart room:** R

Grab the ★ target loot to unlock the exit, then reach the door. Getting seen fills the alarm — break line of sight to let it drain. A full alarm, or a guard's hands on you, costs a life.

## Screenshots

The three shots in `screenshots/` are staged from the real game (`?shot=start|play|end&seed=1`): the title over the gallery, a mid-heist frame with the thief, guard cones, a camera sweep, the Star Diamond and a part-full alarm meter, and the level-clear screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=j777ez47&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
