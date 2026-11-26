// A full autopilot playthrough: run with `node tests/simulate.mjs`.
// The autopilot chases each ring, then lines up for the runway. It must collect
// most of the rings and land: a game nobody can finish is not a game.
import { createWorld, EVENT_CRASH, EVENT_LAND, EVENT_RING } from '../game/src/world.js';
import { createRandom } from '../game/src/random.js';
import { RUNWAY, STEP } from '../game/src/config.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function autopilot(state) {
  const flight = state.flight;
  const ring = state.nextRing;
  if (ring === null) {
    // No rings left: line up for the runway and descend.
    const toRunway = RUNWAY.at - flight.distance;
    const targetAlt = Math.max(0, toRunway * 0.16);
    return {
      pitch: clamp((targetAlt - flight.altitude) / 200, -1, 1),
      bank: clamp(-state.lateral / 300, -1, 1),
      throttle: flight.speed < 95 ? 1 : flight.speed > 115 ? -1 : 0,
    };
  }
  const altError = ring.alt - flight.altitude;
  return {
    pitch: clamp(altError / 250, -1, 1),
    bank: clamp((ring.lateral - state.lateral) / 300, -1, 1),
    throttle: flight.speed < 170 ? 1 : flight.speed > 215 ? -1 : 0,
  };
}

const world = createWorld(createRandom(42));
const state = world.state;
let events = 0;
let steps = 0;
const maxSteps = 60 * 600;
while (steps < maxSteps && !state.won && !state.over) {
  steps += 1;
  const stepEvents = world.step(STEP, autopilot(state));
  events |= stepEvents;
  if (stepEvents & EVENT_CRASH) {
    if (state.lives <= 0) break;
    world.respawn();
  }
  if (stepEvents & EVENT_LAND) break;
}

console.log(JSON.stringify({
  won: state.won,
  over: state.over,
  ringsHit: state.ringsHit,
  ringsTotal: state.ringsTotal,
  score: state.score,
  livesLeft: state.lives,
  seconds: Math.round(steps / 60),
}));

let failed = 0;
if (state.ringsHit < 12) {
  console.log(`FAIL autopilot should collect most rings (got ${state.ringsHit}/18)`);
  failed += 1;
} else console.log('ok   autopilot collects most rings');
if (!state.won) {
  console.log('FAIL autopilot should land and win');
  failed += 1;
} else console.log('ok   autopilot lands and wins the mission');
process.exit(failed === 0 ? 0 : 1);
