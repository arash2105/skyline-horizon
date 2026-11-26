// Flight-model checks: run with `node tests/logic.mjs`.
// The flight model is pure JavaScript, so Node can import it directly.
import { createFlight, stepFlight } from '../game/src/physics.js';
import { createWorld, EVENT_LAND, EVENT_RING } from '../game/src/world.js';
import { createRandom } from '../game/src/random.js';
import { PLANE, STEP } from '../game/src/config.js';

let failed = 0;
function check(name, condition) {
  if (condition) console.log(`ok   ${name}`);
  else {
    console.log(`FAIL ${name}`);
    failed += 1;
  }
}

// Full throttle spools the speed up toward the maximum.
{
  const flight = createFlight();
  flight.onGround = false;
  for (let index = 0; index < 60 * 20; index += 1) stepFlight(flight, { pitch: 0, bank: 0, throttle: 1 }, 0);
  check('full throttle reaches cruise speed', flight.speed > 200 && flight.speed <= PLANE.maxSpeed);
}

// Closing the throttle lets the speed decay.
{
  const flight = createFlight();
  flight.onGround = false;
  flight.speed = 200;
  flight.throttle = 1;
  for (let index = 0; index < 60 * 10; index += 1) stepFlight(flight, { pitch: 0, bank: 0, throttle: -1 }, 0);
  check('closed throttle slows the plane', flight.speed < 40);
}

// Below the stall speed the wing stops flying and the plane sinks.
{
  const flight = createFlight();
  flight.onGround = false;
  flight.altitude = 1500;
  flight.speed = 50;
  flight.throttle = 0;
  let sank = false;
  for (let index = 0; index < 60 * 5; index += 1) {
    stepFlight(flight, { pitch: 0, bank: 0, throttle: 0 }, 0);
    if (flight.stalled) sank = true;
  }
  check('slow flight stalls and sinks', sank && flight.altitude < 1500);
}

// Banking turns the nose.
{
  const flight = createFlight();
  flight.onGround = false;
  flight.speed = 180;
  const start = flight.heading;
  for (let index = 0; index < 60 * 5; index += 1) stepFlight(flight, { pitch: 0, bank: 1, throttle: 0 }, 0);
  check('a right bank turns the nose right', flight.heading > start);
}

// The course has three legs and eighteen rings.
{
  const world = createWorld(createRandom(42));
  check('eighteen rings on the course', world.rings.length === 18);
  check('rings rise along the course', world.rings.every((ring, index) => index === 0 || ring.at > world.rings[index - 1].at));
}

// A ring is scored by flying through it.
{
  const world = createWorld(createRandom(42));
  const ring = world.rings[0];
  const flight = world.state.flight;
  flight.onGround = false;
  flight.distance = ring.at - 100;
  flight.altitude = ring.alt;
  flight.speed = 180;
  world.state.lateral = ring.lateral;
  let events = 0;
  for (let index = 0; index < 120; index += 1) events |= world.step(STEP, { pitch: 0, bank: 0, throttle: 0 });
  check('flying through a ring scores it', (events & EVENT_RING) !== 0 && world.state.ringsHit === 1);
}

// A gentle landing on the runway wins the mission.
{
  const world = createWorld(createRandom(42));
  const flight = world.state.flight;
  flight.onGround = false;
  flight.distance = 41900;
  flight.altitude = 30;
  flight.speed = 95;
  flight.verticalSpeed = -200;
  flight.gearDown = true;
  let events = 0;
  for (let index = 0; index < 600 && !(events & EVENT_LAND); index += 1) {
    events |= world.step(STEP, { pitch: 0, bank: 0, throttle: -1 });
  }
  check('a gentle runway landing wins', (events & EVENT_LAND) !== 0 && world.state.won);
}

process.exit(failed === 0 ? 0 : 1);
