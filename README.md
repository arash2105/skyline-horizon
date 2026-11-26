# Skyline Horizon

A flight game for the make.fun "Make the best flight game" bounty
(`best-flight-game-20261126-0057`).

Fly the orange seaplane "SH-42" through glowing rings over a coastal
archipelago at golden hour, then land on the island runway. The game runs
in a desktop browser from static files, with no network request, and is
played with keyboard and mouse.

## How to play

- **W / S** (or Shift / Ctrl): throttle up and down
- **Arrow Up / Down**: pitch up and down
- **Arrow Left / Right** (or A / D): bank left and right; the bank turns the nose
- **G**: landing gear up and down
- **P** or **Esc**: pause
- **Space** or click: start, restart

Fly through the amber rings: each one scores points and refuels the plane.
Mind the stall speed (below 68 knots the wing stops flying), the fuel gauge,
and the island hills. Three legs — Island Chain, The Strait, Final Approach —
end with a landing on the runway: gear down, under 110 knots, gentle descent.

## How to run it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, staged deterministically with `?shot=cover|play|danger|land&seed=42`:

1. `1-cover.jpg` — the title screen, the plane on the runway at golden hour
2. `2-play.jpg` — mid-course, flying through a ring over the sea stacks
3. `3-danger.jpg` — low fuel, low over the rocks, warning lit
4. `4-land.jpg` — final approach, gear down, runway lights ahead

## Layout

- `main.ts` — hands the entry in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library
- `game/index.html` — the page; `game/src/` holds the game, one job per file:
  `config.js` (tuning and palette), `random.js` (seeded random),
  `input.js` (keyboard and mouse), `physics.js` (the flight model),
  `world.js` (course, rings, islands, scoring), `render.js` (all drawing),
  `audio.js` (procedural WebAudio sound), `shots.js` (screenshot scenes),
  `main.js` (the loop and the screens)
- `vendor/makefun-game.ts` — the kit's library, unchanged
- `tests/` — Node checks: `logic.mjs` (flight model), `simulate.mjs`
  (a full autopilot playthrough), `validate.mjs` (deterministic output,
  screenshot limits, kit check)

## License

MIT. See `LICENSE`.
