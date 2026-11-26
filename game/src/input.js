// Keyboard and pointer input. Held keys give pitch, bank and throttle; one-shot
// presses (start or restart, pause, gear) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost and never counted twice.
// The mouse steers too: holding the pointer down banks toward it.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GEAR = 4;

const PITCH_UP = new Set(['ArrowUp', 'KeyI']);
const PITCH_DOWN = new Set(['ArrowDown', 'KeyK']);
const BANK_LEFT = new Set(['ArrowLeft', 'KeyA']);
const BANK_RIGHT = new Set(['ArrowRight', 'KeyD']);
const THROTTLE_UP = new Set(['KeyW', 'ShiftLeft', 'ShiftRight']);
const THROTTLE_DOWN = new Set(['KeyS', 'ControlLeft', 'ControlRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const GEAR = new Set(['KeyG']);

export function createInput(target) {
  let pitchUp = false;
  let pitchDown = false;
  let bankLeft = false;
  let bankRight = false;
  let throttleUp = false;
  let throttleDown = false;
  let actions = 0;
  let pointerX = 0;
  let pointerDown = false;

  window.addEventListener('keydown', (event) => {
    if (PITCH_UP.has(event.code)) pitchUp = true;
    else if (PITCH_DOWN.has(event.code)) pitchDown = true;
    else if (BANK_LEFT.has(event.code)) bankLeft = true;
    else if (BANK_RIGHT.has(event.code)) bankRight = true;
    else if (THROTTLE_UP.has(event.code)) throttleUp = true;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (GEAR.has(event.code)) {
      if (!event.repeat) actions |= ACTION_GEAR;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (PITCH_UP.has(event.code)) pitchUp = false;
    else if (PITCH_DOWN.has(event.code)) pitchDown = false;
    else if (BANK_LEFT.has(event.code)) bankLeft = false;
    else if (BANK_RIGHT.has(event.code)) bankRight = false;
    else if (THROTTLE_UP.has(event.code)) throttleUp = false;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    pitchUp = false;
    pitchDown = false;
    bankLeft = false;
    bankRight = false;
    throttleUp = false;
    throttleDown = false;
    pointerDown = false;
  });
  target.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    pointerX = event.clientX;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
  });
  target.addEventListener('pointerup', () => {
    pointerDown = false;
  });

  return {
    /** +1 to climb, -1 to descend, 0 for level flight. */
    pitch() {
      return (pitchUp ? 1 : 0) - (pitchDown ? 1 : 0);
    },
    /** -1 for a left bank, +1 for a right bank, 0 for wings level. */
    bank() {
      let value = (bankRight ? 1 : 0) - (bankLeft ? 1 : 0);
      if (value === 0 && pointerDown) {
        const centre = window.innerWidth / 2;
        if (pointerX < centre - 40) value = -1;
        else if (pointerX > centre + 40) value = 1;
      }
      return value;
    },
    /** -1 to close the throttle, +1 to open it, 0 to hold it. */
    throttle() {
      return (throttleUp ? 1 : 0) - (throttleDown ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
