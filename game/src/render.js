// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Golden-hour light over a coastal archipelago: a low sun, a purple
// mountain ridge, a glittering sea, sand islands with palms, a lighthouse, and the
// island runway. The plane is a detailed orange prop plane drawn from paths; the HUD
// is amber glass: altitude, speed, a compass tape, fuel, the next ring and the score.
// Nothing here reads the clock: the caller passes `t`, seconds, so a screenshot scene
// can paint the same frame twice.
import { FIELD, FONT, LIVES, PALETTE, RING, RUNWAY } from './config.js';
import { ALTITUDE_SCALE, DISTANCE_SCALE, LATERAL_SCALE } from './world.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** Screen height of the sea line, where altitude reads zero. */
const SEA_Y = 600;
/** The plane's fixed screen anchor; the world scrolls past it. */
const PLANE_X = 420;

function skyGradient(context) {
  const gradient = context.createLinearGradient(0, 0, 0, FIELD.horizonY);
  gradient.addColorStop(0, PALETTE.skyTop);
  gradient.addColorStop(0.55, PALETTE.skyMid);
  gradient.addColorStop(0.9, PALETTE.skyLow);
  gradient.addColorStop(1, PALETTE.horizonGlow);
  return gradient;
}

function seaGradient(context) {
  const gradient = context.createLinearGradient(0, FIELD.horizonY, 0, FIELD.height);
  gradient.addColorStop(0, PALETTE.seaShallow);
  gradient.addColorStop(0.35, PALETTE.seaDeep);
  gradient.addColorStop(1, '#082a44');
  return gradient;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  // Fixed decoration, seeded once so every frame draws the same sky.
  const decor = createRandom(7);
  const clouds = [];
  for (let index = 0; index < 9; index += 1) {
    clouds.push({ x: decor() * FIELD.width, y: 40 + decor() * 220, width: 120 + decor() * 180, speed: 4 + decor() * 8 });
  }
  const ridge = [];
  for (let x = 0; x <= FIELD.width; x += 40) {
    ridge.push({ x, y: FIELD.horizonY - 18 - decor() * 66 });
  }
  const glitter = [];
  for (let index = 0; index < 60; index += 1) {
    glitter.push({ x: 700 + decor() * 560, y: FIELD.horizonY + 20 + decor() * 240, length: 20 + decor() * 70, phase: decor() * 6.28 });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `600 ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  function planeScreen(state) {
    const flight = state.flight;
    return {
      x: PLANE_X + state.lateral * LATERAL_SCALE,
      y: SEA_Y - flight.altitude * ALTITUDE_SCALE,
    };
  }

  function featureX(state, distance) {
    return PLANE_X + state.lateral * LATERAL_SCALE + (distance - state.flight.distance) * DISTANCE_SCALE;
  }

  function drawSky(t) {
    context.fillStyle = skyGradient(context);
    context.fillRect(0, 0, FIELD.width, FIELD.horizonY + 2);
    // The low sun and its haze.
    const halo = context.createRadialGradient(980, 330, 10, 980, 330, 220);
    halo.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
    halo.addColorStop(0.25, 'rgba(255, 157, 69, 0.55)');
    halo.addColorStop(1, 'rgba(255, 157, 69, 0)');
    context.fillStyle = halo;
    context.fillRect(760, 110, 440, 440);
    context.fillStyle = PALETTE.sunCore;
    context.beginPath();
    context.arc(980, 330, 34, 0, Math.PI * 2);
    context.fill();
    // Slow clouds, lit from below.
    context.fillStyle = 'rgba(255, 217, 176, 0.75)';
    for (const cloud of clouds) {
      const x = ((cloud.x + t * cloud.speed) % (FIELD.width + 260)) - 130;
      context.beginPath();
      context.ellipse(x, cloud.y, cloud.width / 2, 16, 0, 0, Math.PI * 2);
      context.ellipse(x + 40, cloud.y + 8, cloud.width / 3, 12, 0, 0, Math.PI * 2);
      context.fill();
    }
    // The far mountain ridge across the horizon.
    context.fillStyle = PALETTE.mountainFar;
    context.beginPath();
    context.moveTo(0, FIELD.horizonY);
    for (const point of ridge) context.lineTo(point.x, point.y);
    context.lineTo(FIELD.width, FIELD.horizonY);
    context.closePath();
    context.fill();
  }

  function drawSea(t) {
    context.fillStyle = seaGradient(context);
    context.fillRect(0, FIELD.horizonY, FIELD.width, FIELD.height - FIELD.horizonY);
    // Sun glitter: short bright strokes that shimmer with time.
    context.strokeStyle = 'rgba(255, 217, 138, 0.5)';
    context.lineWidth = 2;
    for (const drop of glitter) {
      const alpha = 0.25 + 0.25 * Math.sin(t * 1.4 + drop.phase);
      context.globalAlpha = alpha;
      context.beginPath();
      context.moveTo(drop.x - drop.length / 2, drop.y);
      context.lineTo(drop.x + drop.length / 2, drop.y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function drawPalm(x, baseY, height, lean) {
    context.strokeStyle = '#6b4423';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(x, baseY);
    context.quadraticCurveTo(x + lean, baseY - height * 0.6, x + lean * 2, baseY - height);
    context.stroke();
    const topX = x + lean * 2;
    const topY = baseY - height;
    context.strokeStyle = '#3f8f3a';
    context.lineWidth = 4;
    for (let frond = 0; frond < 6; frond += 1) {
      const angle = -Math.PI * (0.08 + frond * 0.16);
      context.beginPath();
      context.moveTo(topX, topY);
      context.quadraticCurveTo(
        topX + Math.cos(angle) * 26, topY + Math.sin(angle) * 14 + 6,
        topX + Math.cos(angle) * 42, topY + Math.sin(angle) * 26 + 12,
      );
      context.stroke();
    }
  }

  function drawLighthouse(x, baseY) {
    context.fillStyle = '#f5efe0';
    context.fillRect(x - 9, baseY - 78, 18, 78);
    context.fillStyle = '#d84a35';
    context.fillRect(x - 9, baseY - 62, 18, 12);
    context.fillRect(x - 9, baseY - 34, 18, 12);
    context.fillStyle = '#2b2118';
    context.fillRect(x - 12, baseY - 90, 24, 12);
    context.fillStyle = '#ffe9a8';
    context.beginPath();
    context.arc(x, baseY - 84, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 233, 168, 0.18)';
    context.beginPath();
    context.moveTo(x, baseY - 84);
    context.lineTo(x + 150, baseY - 120);
    context.lineTo(x + 150, baseY - 48);
    context.closePath();
    context.fill();
  }

  function drawIsland(state, island) {
    const x = featureX(state, island.at);
    const half = (island.span * DISTANCE_SCALE) / 2;
    if (x + half < -80 || x - half > FIELD.width + 80) return;
    const hillPx = island.hill * ALTITUDE_SCALE;
    // Sand beach, then the green hill.
    context.fillStyle = PALETTE.sand;
    context.beginPath();
    context.ellipse(x, SEA_Y + 6, half, 16, 0, 0, Math.PI * 2);
    context.fill();
    if (hillPx > 4) {
      context.fillStyle = PALETTE.islandGreen;
      context.beginPath();
      context.moveTo(x - half * 0.85, SEA_Y + 4);
      context.quadraticCurveTo(x - half * 0.3, SEA_Y - hillPx, x, SEA_Y - hillPx - 8);
      context.quadraticCurveTo(x + half * 0.3, SEA_Y - hillPx, x + half * 0.85, SEA_Y + 4);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.islandDark;
      context.beginPath();
      context.moveTo(x - half * 0.2, SEA_Y - hillPx * 0.4);
      context.quadraticCurveTo(x, SEA_Y - hillPx - 8, x + half * 0.25, SEA_Y - hillPx * 0.35);
      context.lineTo(x + half * 0.4, SEA_Y + 4);
      context.lineTo(x - half * 0.4, SEA_Y + 4);
      context.closePath();
      context.fill();
    }
    for (const palm of island.palms) {
      drawPalm(x + palm.offset * DISTANCE_SCALE, SEA_Y - 2, palm.height, 6);
    }
    if (island.kind === 'lighthouse') drawLighthouse(x + half * 0.4, SEA_Y - 2);
    if (island.kind === 'village') {
      context.fillStyle = '#f5efe0';
      for (let house = 0; house < 4; house += 1) {
        const hx = x - half * 0.5 + house * 34;
        context.fillRect(hx, SEA_Y - 22, 26, 20);
        context.fillStyle = '#c65a3a';
        context.beginPath();
        context.moveTo(hx - 2, SEA_Y - 22);
        context.lineTo(hx + 13, SEA_Y - 34);
        context.lineTo(hx + 28, SEA_Y - 22);
        context.closePath();
        context.fill();
        context.fillStyle = '#f5efe0';
      }
    }
    if (island.kind === 'runway') drawRunway(state, island);
  }

  function drawRunway(state, island) {
    const x = featureX(state, RUNWAY.at);
    const lengthPx = RUNWAY.length * DISTANCE_SCALE;
    const y = SEA_Y + 2;
    context.fillStyle = '#33302e';
    context.fillRect(x, y, lengthPx, 14);
    context.fillStyle = '#f5efe0';
    for (let dash = 0; dash < 12; dash += 1) {
      context.fillRect(x + 30 + dash * 72, y + 6, 34, 3);
    }
    context.fillRect(x + 6, y + 2, 8, 10);
    context.fillRect(x + lengthPx - 14, y + 2, 8, 10);
    // Threshold lights, amber, lit.
    for (let light = 0; light <= 8; light += 1) {
      context.fillStyle = PALETTE.hudAmber;
      context.beginPath();
      context.arc(x + (light * lengthPx) / 8, y - 3, 3, 0, Math.PI * 2);
      context.fill();
    }
    // Windsock on a pole beside the threshold.
    context.strokeStyle = '#d8d2c4';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x + 40, y);
    context.lineTo(x + 40, y - 52);
    context.stroke();
    context.fillStyle = '#ff7a1a';
    context.beginPath();
    context.moveTo(x + 40, y - 52);
    context.lineTo(x + 78, y - 44);
    context.lineTo(x + 40, y - 36);
    context.closePath();
    context.fill();
    void island;
  }

  function drawRings(state, t) {
    for (const ring of state.rings) {
      if (ring.hit) continue;
      const x = featureX(state, ring.at);
      if (x < -100 || x > FIELD.width + 100) continue;
      const y = SEA_Y - ring.alt * ALTITUDE_SCALE;
      const radius = RING.radius * ALTITUDE_SCALE + 6;
      const isNext = state.nextRing === ring;
      const pulse = isNext ? 1 + 0.08 * Math.sin(t * 5) : 1;
      context.save();
      context.translate(x, y);
      context.scale(1, 0.82);
      context.globalAlpha = isNext ? 0.95 : 0.45;
      context.strokeStyle = PALETTE.ringGlow;
      context.lineWidth = 10;
      context.beginPath();
      context.arc(0, 0, radius * pulse, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = PALETTE.ring;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(0, 0, radius * pulse, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      if (isNext) {
        context.globalAlpha = 1;
        text(`${Math.max(0, Math.round(ring.at - state.flight.distance))} ft`, x, y - radius - 14, 20, PALETTE.hudAmber, 'center');
      }
    }
  }

  function drawPlane(state, t) {
    const flight = state.flight;
    const at = planeScreen(state);
    context.save();
    context.translate(at.x, at.y);
    context.rotate((-flight.pitch * Math.PI) / 180);
    context.rotate((flight.bank * Math.PI) / 540);
    // Propeller disc and blades, spinning with the throttle.
    const spin = t * (4 + flight.throttle * 26);
    context.fillStyle = 'rgba(200, 220, 235, 0.28)';
    context.beginPath();
    context.ellipse(58, -2, 6, 34, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#3a2f26';
    context.lineWidth = 4;
    const blade = Math.sin(spin) * 30;
    context.beginPath();
    context.moveTo(58, -2 - blade);
    context.lineTo(58, -2 + blade);
    context.stroke();
    // Tail fin and stabiliser.
    context.fillStyle = PALETTE.planeOrange;
    context.beginPath();
    context.moveTo(-52, -6);
    context.lineTo(-72, -34);
    context.lineTo(-58, -34);
    context.lineTo(-38, -8);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.planeCream;
    context.beginPath();
    context.moveTo(-58, 2);
    context.lineTo(-78, 10);
    context.lineTo(-56, 12);
    context.closePath();
    context.fill();
    // Fuselage.
    const body = context.createLinearGradient(0, -18, 0, 12);
    body.addColorStop(0, '#ff9a3d');
    body.addColorStop(0.55, PALETTE.planeOrange);
    body.addColorStop(1, '#d84a12');
    context.fillStyle = body;
    context.beginPath();
    context.moveTo(-58, -4);
    context.quadraticCurveTo(-30, -18, 10, -14);
    context.quadraticCurveTo(48, -10, 56, -2);
    context.quadraticCurveTo(48, 8, 10, 10);
    context.quadraticCurveTo(-30, 12, -58, 4);
    context.closePath();
    context.fill();
    // Wing, seen from the side: a thin swept shape under the fuselage.
    context.fillStyle = '#e86a10';
    context.beginPath();
    context.moveTo(-14, 4);
    context.lineTo(30, 14);
    context.lineTo(38, 14);
    context.lineTo(10, 2);
    context.closePath();
    context.fill();
    // Cockpit glass, lit, with a glint.
    context.fillStyle = PALETTE.glass;
    context.beginPath();
    context.moveTo(6, -13);
    context.quadraticCurveTo(22, -20, 34, -10);
    context.quadraticCurveTo(30, -4, 14, -5);
    context.quadraticCurveTo(4, -6, 6, -13);
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(12, -16);
    context.lineTo(24, -10);
    context.stroke();
    // Instrument glow inside the cockpit.
    context.fillStyle = 'rgba(255, 194, 61, 0.9)';
    context.fillRect(16, -8, 12, 3);
    // Registration and the horizon name on the fuselage.
    text('SH-42', -34, 8, 13, PALETTE.planeCream, 'left');
    // Navigation lights: red on the left, green on the right, blinking white on the tail.
    context.fillStyle = '#ff3b30';
    context.beginPath();
    context.arc(-56, -2, 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#35e08a';
    context.beginPath();
    context.arc(56, -2, 3, 0, Math.PI * 2);
    context.fill();
    if (Math.floor(t * 1.5) % 2 === 0) {
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(-70, -30, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    // Landing gear, down for takeoff and landing.
    if (flight.gearDown) {
      context.strokeStyle = PALETTE.planeDark;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-28, 10);
      context.lineTo(-28, 22);
      context.moveTo(28, 8);
      context.lineTo(28, 22);
      context.stroke();
      context.fillStyle = '#1d1712';
      context.beginPath();
      context.arc(-28, 24, 6, 0, Math.PI * 2);
      context.arc(28, 24, 6, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function hudPanel(x, y, width, height) {
    context.fillStyle = PALETTE.hudGlass;
    context.beginPath();
    context.roundRect(x, y, width, height, 10);
    context.fill();
    context.strokeStyle = 'rgba(255, 194, 61, 0.35)';
    context.lineWidth = 1;
    context.stroke();
  }

  function drawHud(state, t) {
    const flight = state.flight;
    const ring = state.nextRing;
    // Altitude, speed and vertical speed, top left, instruments lit amber.
    hudPanel(20, 16, 250, 108);
    text('ALT', 36, 38, 15, PALETTE.hudMuted, 'left');
    text(`${Math.max(0, Math.round(flight.altitude))} ft`, 36, 68, 30, PALETTE.hudText, 'left');
    text(flight.verticalSpeed >= 0 ? `▲ ${Math.round(flight.verticalSpeed)} fpm` : `▼ ${Math.round(-flight.verticalSpeed)} fpm`, 36, 94, 16, PALETTE.hudMuted, 'left');
    text('SPD', 168, 38, 15, PALETTE.hudMuted, 'left');
    text(`${Math.round(flight.speed)} kt`, 168, 68, 30, PALETTE.hudText, 'left');
    text(flight.stalled ? 'STALL' : 'FLYING', 168, 94, 16, flight.stalled ? PALETTE.hudDanger : PALETTE.hudOk, 'left');
    // Compass tape, top centre: heading with the cardinal points.
    hudPanel(460, 16, 360, 64);
    const headings = [0, 45, 90, 135, 180, 225, 270, 315];
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (const heading of headings) {
      let diff = heading - flight.heading;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const x = 640 + diff * 2.2;
      if (x < 470 || x > 810) continue;
      text(names[heading], x, 42, 15, PALETTE.hudMuted, 'center');
      text(String(heading).padStart(3, '0'), x, 64, 15, PALETTE.hudText, 'center');
    }
    context.fillStyle = PALETTE.hudAmber;
    context.beginPath();
    context.moveTo(640, 80);
    context.lineTo(632, 68);
    context.lineTo(648, 68);
    context.closePath();
    context.fill();
    // Score, rings and fuel, top right.
    hudPanel(1010, 16, 250, 108);
    text('SCORE', 1026, 38, 15, PALETTE.hudMuted, 'left');
    text(String(state.score), 1026, 68, 30, PALETTE.hudText, 'left');
    text(`RINGS ${state.ringsHit}/${state.ringsTotal}`, 1130, 38, 15, PALETTE.hudMuted, 'left');
    text(state.legName, 1130, 68, 18, PALETTE.hudAmber, 'left');
    text('FUEL', 1026, 94, 15, PALETTE.hudMuted, 'left');
    context.fillStyle = 'rgba(255, 255, 255, 0.18)';
    context.fillRect(1080, 84, 160, 12);
    context.fillStyle = flight.fuel < 25 ? PALETTE.hudDanger : PALETTE.hudOk;
    context.fillRect(1080, 84, 160 * (flight.fuel / 100), 12);
    // Throttle gauge, bottom left.
    hudPanel(20, 612, 220, 88);
    text('THR', 36, 634, 15, PALETTE.hudMuted, 'left');
    context.fillStyle = 'rgba(255, 255, 255, 0.18)';
    context.fillRect(36, 646, 188, 12);
    context.fillStyle = PALETTE.hudAmber;
    context.fillRect(36, 646, 188 * flight.throttle, 12);
    text(`GEAR ${flight.gearDown ? 'DOWN' : 'UP'}`, 36, 686, 16, PALETTE.hudText, 'left');
    // Next ring: a big arrow pointing at it, bottom centre.
    if (ring) {
      const at = planeScreen(state);
      const dx = (ring.at - flight.distance) * DISTANCE_SCALE;
      const dy = (SEA_Y - ring.alt * ALTITUDE_SCALE) - at.y;
      const angle = Math.atan2(dy, dx);
      const arrowX = 640;
      const arrowY = 660;
      context.save();
      context.translate(arrowX, arrowY);
      context.rotate(angle);
      context.fillStyle = PALETTE.hudAmber;
      context.beginPath();
      context.moveTo(28, 0);
      context.lineTo(-12, -12);
      context.lineTo(-12, 12);
      context.closePath();
      context.fill();
      context.restore();
      text(`NEXT RING ${Math.max(0, Math.round(ring.at - flight.distance))} ft`, arrowX, 700, 16, PALETTE.hudAmber, 'center');
    }
    // Warnings, centre screen, flashing.
    const blink = Math.floor(t * 2.5) % 2 === 0;
    if (blink) {
      if (flight.stalled) text('STALL — NOSE DOWN, ADD POWER', 640, 200, 30, PALETTE.hudDanger, 'center');
      else if (flight.fuel < 25 && flight.fuel > 0) text('LOW FUEL — FLY THE RINGS', 640, 200, 30, PALETTE.hudDanger, 'center');
      else if (flight.altitude < 300 && flight.altitude > 0 && flight.verticalSpeed < -400) text('PULL UP', 640, 200, 34, PALETTE.hudDanger, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const height = 150 + lines.length * 36;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2 - 30;
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.roundRect(x, y, width, height, 16);
    context.fill();
    context.strokeStyle = 'rgba(255, 194, 61, 0.5)';
    context.lineWidth = 1.5;
    context.stroke();
    text(title, FIELD.width / 2, y + 64, 46, PALETTE.hudAmber, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 112 + index * 36, 21, PALETTE.hudText, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 26, 22, PALETTE.hudOk, 'center');
  }

  /** Paint one frame: the sky, sea, islands, rings and plane, then the HUD or a panel. */
  function draw(state, screen, best, options) {
    const t = options?.t ?? 0;
    const notice = options?.notice ?? null;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(t);
    drawSea(t);
    for (const island of state.islands) drawIsland(state, island);
    drawRings(state, t);
    drawPlane(state, t);
    if (screen === SCREEN_TITLE) {
      drawPanel('SKYLINE HORIZON', [
        'Fly the orange seaplane through the rings',
        'and land on the island runway.',
        'W/S throttle · Arrows pitch and bank · G gear · P pause',
        `Best score ${best}`,
      ], 'Press Space or click to fly');
      return;
    }
    drawHud(state, t);
    if (notice) {
      context.fillStyle = PALETTE.hudGlass;
      context.beginPath();
      context.roundRect(440, 140, 400, 52, 10);
      context.fill();
      text(notice, 640, 176, 24, PALETTE.hudAmber, 'center');
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The islands will wait for you.'], 'Press P to keep flying');
    } else if (screen === SCREEN_OVER) {
      drawPanel('CRASHED', [
        `Score ${state.score} · Rings ${state.ringsHit}/${state.ringsTotal}`,
        state.lives > 0 ? `${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left — try the leg again` : 'Out of lives',
        `Best score ${best}`,
      ], state.lives > 0 ? 'Press Space to fly again' : 'Press Space for a new flight');
    } else if (screen === SCREEN_WIN) {
      drawPanel('LANDED — MISSION COMPLETE', [
        `Score ${state.score} · Rings ${state.ringsHit}/${state.ringsTotal} · Fuel left ${Math.round(state.flight.fuel)}%`,
        `Best score ${best}`,
      ], 'Press Space to fly again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
