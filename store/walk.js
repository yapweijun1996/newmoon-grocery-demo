// The shop is a cutaway; the floor edges also act as invisible room boundaries.
// Footprints match the fitted cabinets, left refill fixture, island and gifting table.
const obstacles = [
  { minX: -3.75, maxX: 1.13, minZ: -2.52, maxZ: -1.68 },
  { minX: -3.95, maxX: -3.03, minZ: -1.8, maxZ: 1.35 },
  { minX: -2.595, maxX: 1.015, minZ: 0.085, maxZ: 1.435 },
  { minX: 1.59, maxX: 3.51, minZ: -0.92, maxZ: 1.0 },
];
const radius = 0.22;
const blocked = (x, z) =>
  x < -3.83 || x > 3.9 || z < -2.4 || z > 2.48 ||
  obstacles.some((b) => x > b.minX - radius && x < b.maxX + radius &&
    z > b.minZ - radius && z < b.maxZ + radius);

export function createWalk({ camera, canvas, invalidate }) {
  const joystick = document.querySelector('#joystick');
  const stick = document.querySelector('#stick');
  const keys = new Set();
  let active = false, yaw = 0, pitch = -0.12, look = null, touch = null;
  let moveX = 0, moveY = 0, previous = 0;
  const angles = () => {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    invalidate();
  };
  function reset() {
    camera.position.set(0, 1.6, 2.13);
    yaw = 0;
    pitch = -0.12;
    angles();
  }
  function clear() {
    keys.clear();
    moveX = moveY = 0;
    look = touch = null;
    stick.style.transform = '';
    previous = 0;
  }
  function setActive(on) {
    active = on;
    clear();
    if (on) reset();
  }
  const keyNames = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', (e) => {
    if (!active || !keyNames.has(e.code) || document.querySelector('dialog[open]') ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    e.preventDefault();
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  canvas.addEventListener('pointerdown', (e) => {
    if (!active || (e.pointerType === 'mouse' && e.button !== 0) || look) return;
    look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!active || !look || look.id !== e.pointerId) return;
    yaw -= (e.clientX - look.x) * 0.005;
    pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - look.y) * 0.005));
    look.x = e.clientX;
    look.y = e.clientY;
    angles();
  });
  const endLook = (e) => { if (look?.id === e.pointerId) look = null; };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);
  function updateStick(e) {
    const rect = joystick.getBoundingClientRect();
    let x = e.clientX - (rect.left + rect.width / 2);
    let y = e.clientY - (rect.top + rect.height / 2);
    const max = rect.width * 0.32, length = Math.hypot(x, y);
    if (length > max) { x *= max / length; y *= max / length; }
    moveX = x / max;
    moveY = -y / max;
    stick.style.transform = `translate(${x}px, ${y}px)`;
  }
  joystick.addEventListener('pointerdown', (e) => {
    if (!active || touch !== null) return;
    e.preventDefault();
    touch = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    updateStick(e);
  });
  joystick.addEventListener('pointermove', (e) => { if (e.pointerId === touch) updateStick(e); });
  const endTouch = (e) => {
    if (e.pointerId !== touch) return;
    touch = null;
    moveX = moveY = 0;
    stick.style.transform = '';
  };
  joystick.addEventListener('pointerup', endTouch);
  joystick.addEventListener('pointercancel', endTouch);
  function update(time) {
    if (!active) return;
    const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
    previous = time;
    if (document.querySelector('dialog[open]')) { clear(); return; }
    let x = moveX + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    let forward = moveY + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const length = Math.hypot(x, forward);
    if (!length || !dt) return;
    if (length > 1) { x /= length; forward /= length; }
    const dx = (x * Math.cos(yaw) - forward * Math.sin(yaw)) * 2.2 * dt;
    const dz = (-x * Math.sin(yaw) - forward * Math.cos(yaw)) * 2.2 * dt;
    // Axis-by-axis movement slides along obstacles instead of sticking at corners.
    if (!blocked(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (!blocked(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    invalidate();
  }
  return { setActive, reset, update };
}
