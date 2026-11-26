// The game's rules and state, with no drawing and no browser in it: the seeded
// course of islands, rings and the runway, the plane's place on it, scoring,
// lives and legs. step() advances one fixed step and returns what happened as
// bit flags, so the caller can react without the world knowing about screens
// or sound. Nothing here allocates after createWorld returns.

import { COURSE, LIVES, PLANE, RING, RUNWAY, STEP } from './config.js';
import { createFlight, stepFlight } from './physics.js';

export const EVENT_RING = 1;
export const EVENT_CRASH = 2;
export const EVENT_LAND = 4;
export const EVENT_WIN = 8;
export const EVENT_LEG = 16;
export const EVENT_FUEL_LOW = 32;

/** How many feet of course one screen pixel stands for, ahead of the plane. */
export const DISTANCE_SCALE = 0.35;
/** How many screen pixels one foot of altitude stands for. */
export const ALTITUDE_SCALE = 0.11;
/** How many screen pixels one foot of sideways drift stands for. */
export const LATERAL_SCALE = 0.12;

function makeIslands(random) {
  const islands = [];
  const kinds = ['palm', 'palm', 'rocky', 'palm', 'lighthouse', 'palm', 'village', 'rocky', 'palm', 'palm', 'rocky', 'palm'];
  for (let index = 0; index < kinds.length; index += 1) {
    const at = 3000 + index * 3100 + random() * 900;
    const span = 1400 + random() * 1600;
    // The final approach stays flyable: the islets before the runway are low,
    // so a descending plane can reach the threshold without clipping a hill.
    const hill = at > 34000 ? 120 + random() * 100 : 180 + random() * 620;
    const palms = [];
    const palmCount = 2 + Math.floor(random() * 4);
    for (let palm = 0; palm < palmCount; palm += 1) {
      palms.push({ offset: (random() - 0.5) * span * 0.7, height: 26 + random() * 18 });
    }
    islands.push({
      at,
      span,
      hill,
      kind: kinds[index],
      palms,
      rockSeed: random(),
    });
  }
  // The runway island: flat, with a village and the runway itself.
  islands.push({ at: RUNWAY.at, span: RUNWAY.length + 2400, hill: 0, kind: 'runway', palms: [], rockSeed: 0.5 });
  return islands;
}

function makeRings(random, islands) {
  const rings = [];
  let at = 2500;
  for (let leg = 0; leg < COURSE.legs.length; leg += 1) {
    const count = COURSE.legs[leg].rings;
    for (let index = 0; index < count; index += 1) {
      // A ring must clear the island hills beneath it and on its approach, or
      // no pilot could fly it: the corridor 1800 ft before the ring counts too.
      let hill = 0;
      for (const island of islands) {
        if (at - 1800 <= island.at + island.span / 2 && at + 200 >= island.at - island.span / 2) {
          hill = Math.max(hill, island.hill);
        }
      }
      const alt = Math.min(2800, Math.max(600 + random() * 2000, hill + 380));
      rings.push({
        at,
        alt,
        lateral: (random() - 0.5) * 1300,
        leg,
        hit: false,
      });
      at += 1500 + random() * 900;
    }
  }
  return rings;
}

export function createWorld(random) {
  const islands = makeIslands(random);
  const rings = makeRings(random, islands);
  const flight = createFlight();
  const state = {
    flight,
    /** The course's islands and rings, for the renderer to draw. */
    islands,
    rings,
    /** Sideways drift off the course line, feet. */
    lateral: 0,
    score: 0,
    ringsHit: 0,
    ringsTotal: rings.length,
    leg: 0,
    legName: COURSE.legs[0].name,
    lives: LIVES,
    over: false,
    won: false,
    landed: false,
    /** The last leg the banner announced, so it shows once per leg. */
    announcedLeg: -1,
    fuelLowWarned: false,
    /** The next ring to fly through, kept fresh for the renderer. */
    nextRing: null,
  };

  function reset() {
    flight.distance = 0;
    flight.altitude = 0;
    flight.speed = 0;
    flight.heading = 90;
    flight.pitch = 0;
    flight.bank = 0;
    flight.throttle = 0;
    flight.fuel = 100;
    flight.verticalSpeed = 0;
    flight.stalled = false;
    flight.gearDown = true;
    flight.onGround = true;
    state.lateral = 0;
    state.score = 0;
    state.ringsHit = 0;
    state.leg = 0;
    state.legName = COURSE.legs[0].name;
    state.lives = LIVES;
    state.over = false;
    state.won = false;
    state.landed = false;
    state.announcedLeg = -1;
    state.fuelLowWarned = false;
    state.nextRing = rings[0] ?? null;
    for (const ring of rings) ring.hit = false;
  }

  function islandUnder(distance) {
    for (const island of islands) {
      if (distance >= island.at - island.span / 2 && distance <= island.at + island.span / 2) return island;
    }
    return null;
  }

  function nextRing() {
    for (const ring of rings) if (!ring.hit) return ring;
    return null;
  }

  /**
   * One fixed step. `control` is { pitch: -1..1, bank: -1..1, throttle: -1..1 }.
   * Returns bit flags: EVENT_RING, EVENT_CRASH, EVENT_LAND, EVENT_WIN,
   * EVENT_LEG, EVENT_FUEL_LOW.
   */
  function step(dt, control) {
    let events = 0;
    if (state.over || state.won) return events;

    const leg = flight.distance < 14000 ? 0 : flight.distance < 28000 ? 1 : 2;
    if (leg !== state.leg) {
      state.leg = leg;
      state.legName = COURSE.legs[leg].name;
      events |= EVENT_LEG;
    }
    const wind = COURSE.legs[leg].wind;

    stepFlight(flight, control, wind);

    // The bank slides the plane sideways; the crosswind shoves it too.
    state.lateral += (flight.bank / PLANE.bankMax) * 480 * dt;
    state.lateral += wind * 3 * dt;
    state.lateral = Math.max(-900, Math.min(900, state.lateral));

    // Takeoff: above the rotate speed the wheels leave the runway.
    if (flight.onGround && flight.speed > PLANE.rotateSpeed) flight.onGround = false;

    // Rings: pass through the hole, near the centre, for the full bonus.
    const ring = nextRing();
    if (ring !== null && !flight.onGround) {
      const along = Math.abs(flight.distance - ring.at);
      const up = Math.abs(flight.altitude - ring.alt);
      const across = Math.abs(state.lateral - ring.lateral);
      if (along < 130 && up < RING.radius && across < RING.radius) {
        ring.hit = true;
        state.ringsHit += 1;
        const centre = 1 - Math.max(up, across) / RING.radius;
        const bonus = Math.round(RING.centreBonus * centre);
        state.score += RING.points + bonus;
        flight.fuel = Math.min(100, flight.fuel + PLANE.ringFuel);
        events |= EVENT_RING;
      }
    }

    // Low fuel is warned once, while there is still time to reach the runway.
    if (!state.fuelLowWarned && flight.fuel < 25 && flight.fuel > 0) {
      state.fuelLowWarned = true;
      events |= EVENT_FUEL_LOW;
    }

    // The ground: the sea, the island hills, and the runway.
    if (!flight.onGround && flight.altitude <= 0) {
      const onRunway = flight.distance >= RUNWAY.at - 100 && flight.distance <= RUNWAY.at + RUNWAY.length;
      if (onRunway && flight.gearDown && flight.speed <= RUNWAY.landSpeedMax && flight.verticalSpeed > -700) {
        flight.altitude = 0;
        flight.onGround = true;
        state.landed = true;
        state.won = true;
        state.score += RUNWAY.landPoints + Math.round(flight.fuel * 5);
        events |= EVENT_LAND | EVENT_WIN;
      } else {
        state.lives -= 1;
        state.over = state.lives <= 0;
        events |= EVENT_CRASH;
      }
      return events;
    }
    const island = islandUnder(flight.distance);
    if (!flight.onGround && island !== null && island.hill > 0 && flight.altitude < island.hill) {
      state.lives -= 1;
      state.over = state.lives <= 0;
      events |= EVENT_CRASH;
      return events;
    }

    state.nextRing = nextRing();
    return events;
  }

  /** After a crash with lives left: back to the last ring passed, in the air. */
  function respawn() {
    let anchor = null;
    for (const ring of rings) if (ring.hit) anchor = ring;
    if (anchor === null) {
      flight.distance = 0;
      flight.altitude = 0;
      flight.speed = 0;
      flight.onGround = true;
    } else {
      flight.distance = Math.max(0, anchor.at - 600);
      flight.altitude = anchor.alt;
      flight.speed = 130;
      flight.onGround = false;
    }
    flight.heading = 90;
    flight.pitch = 0;
    flight.bank = 0;
    flight.throttle = 0.6;
    flight.fuel = Math.max(flight.fuel, 45);
    flight.verticalSpeed = 0;
    flight.stalled = false;
    flight.gearDown = true;
    state.lateral = anchor === null ? 0 : anchor.lateral;
    state.over = false;
    state.nextRing = nextRing();
  }

  reset();
  return { state, islands, rings, reset, respawn, step, nextRing, islandUnder };
}
