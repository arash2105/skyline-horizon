// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. Altitudes are in feet, speeds in knots, distances in feet.

export const FIELD = { width: 1280, height: 720, horizonY: 430 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLANE = {
  /** Cruise speed at full throttle, knots. */
  maxSpeed: 240,
  /** Below this speed the wing stops flying and the nose drops. */
  stallSpeed: 68,
  /** How fast speed chases the throttle's target, per second. */
  speedLag: 0.55,
  /** Climb and sink rates, feet per second at full deflection. */
  climbRate: 900,
  sinkRate: 1400,
  /** Degrees of pitch the pilot can command. */
  pitchUp: 22,
  pitchDown: 18,
  /** Degrees of bank the pilot can command. */
  bankMax: 48,
  /** How fast the nose follows the bank, degrees per second. */
  turnRate: 26,
  /** Fuel burn at full throttle, percent per second; rings refund some. */
  fuelBurn: 0.55,
  /** Fuel refunded by each ring, percent. */
  ringFuel: 6,
  /** Takeoff roll speed, knots: the wheels leave the runway above this. */
  rotateSpeed: 75,
};

export const LIVES = 3;

/** The course: three legs, each with its own rings and wind. */
export const COURSE = {
  /** Feet of course from the runway threshold to the last ring. */
  length: 42000,
  legs: [
    { name: 'Island Chain', rings: 8, wind: 4 },
    { name: 'The Strait', rings: 6, wind: 14 },
    { name: 'Final Approach', rings: 4, wind: 7 },
  ],
};

export const RING = {
  /** Ring radius, feet: the hole the plane must pass through. */
  radius: 260,
  /** Points for a clean pass through a ring. */
  points: 100,
  /** Bonus points for passing near the ring's centre. */
  centreBonus: 50,
};

export const RUNWAY = {
  /** Course distance of the runway threshold, feet. */
  at: 42000,
  /** Runway length, feet. */
  length: 2600,
  /** Landing speed window, knots: too fast bounces, too slow stalls onto it. */
  landSpeedMax: 110,
  /** Points for a landing, before the fuel and accuracy bonuses. */
  landPoints: 500,
};

export const PALETTE = {
  backdrop: '#1a1030',
  skyTop: '#241a4d',
  skyMid: '#7a3b6e',
  skyLow: '#e2703a',
  horizonGlow: '#ffb347',
  sunCore: '#fff3c4',
  sunHalo: '#ff9d45',
  seaDeep: '#0d3a5c',
  seaShallow: '#1f7a8c',
  seaGlitter: '#ffd98a',
  sand: '#f2d8a0',
  islandGreen: '#2e6b34',
  islandDark: '#1d4a26',
  rock: '#5c4a52',
  mountainFar: '#4a2d63',
  mountainNear: '#33204a',
  cloud: '#ffd9b0',
  planeOrange: '#ff7a1a',
  planeCream: '#fff1d6',
  planeDark: '#2b2118',
  glass: '#bfe8ff',
  ring: '#ffc23d',
  ringGlow: '#ff9d00',
  hudGlass: 'rgba(20, 12, 32, 0.55)',
  hudAmber: '#ffc23d',
  hudText: '#fff6e0',
  hudMuted: '#d8c49a',
  hudDanger: '#ff5a4e',
  hudOk: '#7dff9e',
  panel: 'rgba(24, 14, 40, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'skyline-horizon.best';
