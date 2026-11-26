// The flight model, with no drawing and no browser in it: speed follows the
// throttle, pitch trades speed for altitude, bank turns the nose, and below the
// stall speed the wing stops flying and the nose drops. step() advances one
// fixed step; the world owns the course, the rings and the ground.

import { PLANE, STEP } from './config.js';

/** The plane's flying state: everything the renderer and the world read. */
export function createFlight() {
  return {
    /** Course distance flown, feet. */
    distance: 0,
    /** Height above the sea, feet. */
    altitude: 0,
    /** Airspeed, knots. */
    speed: 0,
    /** Heading, degrees (0 is north, 90 is east, along the course). */
    heading: 90,
    /** Nose up (+) or down (-), degrees. */
    pitch: 0,
    /** Right wing down (+) or left wing down (-), degrees. */
    bank: 0,
    /** Throttle lever, 0 to 1. */
    throttle: 0,
    /** Fuel left, percent. */
    fuel: 100,
    /** Feet per second, for the variometer. */
    verticalSpeed: 0,
    /** True while the wing has stopped flying. */
    stalled: false,
    /** True while the wheels are down. */
    gearDown: true,
    /** True while the wheels are on the runway. */
    onGround: true,
  };
}

/**
 * One fixed step of flight. `control` is { pitch: -1..1, bank: -1..1, throttle: -1..1 }
 * and `wind` is the crosswind in knots for this leg of the course.
 * Returns nothing; the flight object is updated in place.
 */
export function stepFlight(flight, control, wind) {
  // The throttle lever moves, then the speed chases it.
  flight.throttle = Math.min(1, Math.max(0, flight.throttle + control.throttle * STEP * 0.8));
  const targetSpeed = flight.throttle * PLANE.maxSpeed;
  flight.speed += (targetSpeed - flight.speed) * Math.min(1, PLANE.speedLag * STEP * 4);

  // The wing flies only above the stall speed; below it the nose drops on its own.
  flight.stalled = flight.speed < PLANE.stallSpeed && !flight.onGround;
  const pitchCommand = flight.stalled ? -1 : control.pitch;
  const pitchTarget = pitchCommand >= 0 ? pitchCommand * PLANE.pitchUp : pitchCommand * PLANE.pitchDown;
  flight.pitch += (pitchTarget - flight.pitch) * Math.min(1, 3 * STEP);
  const bankTarget = control.bank * PLANE.bankMax;
  flight.bank += (bankTarget - flight.bank) * Math.min(1, 4 * STEP);

  // Bank turns the nose; the turn also scrubs a little speed.
  flight.heading += (flight.bank / PLANE.bankMax) * PLANE.turnRate * STEP;
  if (flight.heading < 0) flight.heading += 360;
  if (flight.heading >= 360) flight.heading -= 360;
  flight.speed = Math.max(0, flight.speed - (Math.abs(flight.bank) / PLANE.bankMax) * 6 * STEP);

  // Climb and sink: nose-up pitch trades speed for height, and a stalled wing sinks fast.
  const climb = flight.stalled
    ? -PLANE.sinkRate
    : (flight.pitch / PLANE.pitchUp) * PLANE.climbRate * Math.min(1, flight.speed / PLANE.maxSpeed);
  flight.verticalSpeed += (climb - flight.verticalSpeed) * Math.min(1, 2 * STEP);
  flight.altitude += flight.verticalSpeed * STEP;

  // The crosswind pushes the nose off course and shoves the plane sideways.
  flight.heading += (wind / 100) * STEP * 2;

  // Forward progress along the course, in feet per second.
  flight.distance += (flight.speed * 1.68781) * STEP;

  // Fuel burns with the throttle; an empty tank leaves the propeller windmilling.
  if (flight.throttle > 0 && flight.fuel > 0) {
    flight.fuel = Math.max(0, flight.fuel - PLANE.fuelBurn * flight.throttle * STEP);
    if (flight.fuel === 0) flight.throttle = 0;
  }
}
