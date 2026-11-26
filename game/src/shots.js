// The screenshot scenes behind ?shot=cover|play|danger|land. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot that chases the next ring, so the frame is what a short game
// really looks like and the same seed always gives the same frame. Each scene also
// returns the fixed time `t` the renderer should paint with, so the propeller,
// the blinking lights and the warnings land the same way every run.
import { RUNWAY, STEP } from './config.js';
import { EVENT_CRASH } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const PLAY_SECONDS = 24;
const LAND_SECONDS = 14;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Steer toward the next ring: climb or descend to its height, bank to its side. */
function autopilot(state) {
  const ring = state.nextRing;
  const flight = state.flight;
  if (ring === null) return { pitch: 0, bank: 0, throttle: 0 };
  const altError = ring.alt - flight.altitude;
  const pitch = clamp(altError / 250, -1, 1);
  const lateralError = ring.lateral - state.lateral;
  const bank = clamp(lateralError / 300, -1, 1);
  const throttle = flight.speed < 170 ? 1 : flight.speed > 215 ? -1 : 0;
  return { pitch, bank, throttle };
}

/** Run the autopilot for `seconds`, respawning once if it crashes, and return the events seen. */
function flyFor(world, seconds) {
  let events = 0;
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const stepEvents = world.step(STEP, autopilot(world.state));
    events |= stepEvents;
    if (stepEvents & EVENT_CRASH) {
      if (world.state.lives <= 0) break;
      world.respawn();
    }
  }
  return events;
}

/**
 * Set `world` to the named scene (cover, play, danger or land; any other name is
 * cover) and return the screen to draw, the best score to show and the fixed
 * paint time `t`.
 */
export function stageShot(name, world) {
  world.reset();
  const flight = world.state.flight;
  if (name === 'play') {
    flight.throttle = 0.75;
    flyFor(world, PLAY_SECONDS);
    return { screen: SCREEN_PLAY, best: world.state.score, t: 2.0 };
  }
  if (name === 'danger') {
    flight.throttle = 0.8;
    flight.fuel = 18;
    flyFor(world, 16);
    // Low and slow near the rocks: force the warning frame.
    flight.altitude = 260;
    flight.verticalSpeed = -520;
    return { screen: SCREEN_PLAY, best: world.state.score, t: 0.8 };
  }
  if (name === 'land') {
    // The end of a finished course: every ring already flown, gear down, on final.
    for (const ring of world.rings) ring.hit = true;
    world.state.ringsHit = world.rings.length;
    world.state.score = 1800;
    world.state.nextRing = null;
    flight.distance = RUNWAY.at - 1400;
    flight.altitude = 320;
    flight.speed = 100;
    flight.throttle = 0.35;
    flight.gearDown = true;
    flight.onGround = false;
    // A gentle descent onto the threshold: aim at the runway, flare at the end.
    const steps = Math.round(LAND_SECONDS / STEP);
    for (let index = 0; index < steps; index += 1) {
      const toRunway = RUNWAY.at - flight.distance;
      const targetAlt = Math.max(0, toRunway * 0.16);
      const pitch = clamp((targetAlt - flight.altitude) / 200, -1, 1);
      const throttle = flight.speed < 95 ? 1 : flight.speed > 115 ? -1 : 0;
      const stepEvents = world.step(STEP, { pitch, bank: 0, throttle });
      if (stepEvents & EVENT_CRASH) break;
      if (world.state.won) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score, t: 1.6 };
  }
  // Cover: the title screen, the plane sitting on the runway at golden hour.
  flight.distance = RUNWAY.at + 200;
  flight.altitude = 0;
  flight.speed = 0;
  flight.throttle = 0;
  flight.gearDown = true;
  flight.onGround = true;
  return { screen: SCREEN_TITLE, best: 0, t: 1.0 };
}
