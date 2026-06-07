// ============================================================================
// input.js : joystick virtual (movimento) + sensores do device (bandeja)
// Fallbacks de teclado/mouse para testar no desktop.
// ============================================================================
import { clamp } from './utils.js';

export class InputManager {
  constructor() {
    // Vetor de movimento normalizado (-1..1) vindo do joystick / teclado
    this.move = { x: 0, y: 0 };
    this.running = false;

    // Inclinacao do device para a bandeja (rad). tiltX = frente/tras, tiltZ = esq/dir
    this.tiltX = 0;
    this.tiltZ = 0;

    // estado interno
    this._keys = {};
    this._orientationEnabled = false;
    this._tiltBaseBeta = null;   // calibracao (postura neutra do telefone)
    this._tiltBaseGamma = null;
    this._desktopTilt = { x: 0, z: 0 };

    this._initJoystick();
    this._initKeyboard();
    this._initDesktopTilt();
  }

  // --- Joystick virtual (canto inferior esquerdo) -------------------------
  _initJoystick() {
    const base = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    if (!base || !knob) return;
    let active = false, id = null, cx = 0, cy = 0;
    const R = 55;

    const start = (x, y, pid) => {
      active = true; id = pid;
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    };
    const moveTo = (x, y) => {
      if (!active) return;
      let dx = x - cx, dy = y - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = dx / len * R; dy = dy / len * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      // magnitude normalizada 0..1
      const nx = dx / R, ny = dy / R;
      const mag = Math.hypot(nx, ny);
      // zona morta: toques pequenos nao movem (evita drift e excesso de sensibilidade)
      const DEAD = 0.18;
      if (mag < DEAD) { this.move.x = 0; this.move.y = 0; this.running = false; return; }
      // remapeia [DEAD,1] -> [0,1] e aplica curva suave (menos sensivel perto do centro)
      const t = Math.min((mag - DEAD) / (1 - DEAD), 1);
      const curved = t * t;
      this.move.x = (nx / mag) * curved;
      this.move.y = (ny / mag) * curved;
      // correr so quando quase no limite da base
      this.running = mag > 0.9;
    };
    const end = () => {
      active = false; id = null;
      knob.style.transform = 'translate(0,0)';
      this.move.x = 0; this.move.y = 0; this.running = false;
    };

    base.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; start(t.clientX, t.clientY, t.identifier);
      moveTo(t.clientX, t.clientY); e.preventDefault();
    }, { passive: false });
    base.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) moveTo(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    base.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) end();
    });
    // mouse (desktop)
    base.addEventListener('mousedown', (e) => { start(e.clientX, e.clientY, 'm'); moveTo(e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e) => moveTo(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => { if (id === 'm') end(); });
  }

  // --- Teclado (fallback desktop) -----------------------------------------
  _initKeyboard() {
    window.addEventListener('keydown', (e) => { this._keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { this._keys[e.key.toLowerCase()] = false; });
  }

  // setas/WASD para mover, Shift para correr
  _pollKeyboard() {
    const k = this._keys;
    let x = 0, y = 0;
    if (k['a'] || k['arrowleft']) x -= 1;
    if (k['d'] || k['arrowright']) x += 1;
    if (k['w'] || k['arrowup']) y -= 1;
    if (k['s'] || k['arrowdown']) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y) || 1;
      this.move.x = x / l; this.move.y = y / l;
      this.running = !!(k['shift']);
    }
  }

  // --- Inclinacao no desktop: setas IJKL inclinam a bandeja ----------------
  _initDesktopTilt() {
    window.addEventListener('keydown', (e) => {
      const t = this._desktopTilt, s = 0.45;
      if (e.key === 'i') t.x = -s;
      if (e.key === 'k') t.x = s;
      if (e.key === 'j') t.z = -s;
      if (e.key === 'l') t.z = s;
    });
    window.addEventListener('keyup', (e) => {
      const t = this._desktopTilt;
      if (e.key === 'i' || e.key === 'k') t.x = 0;
      if (e.key === 'j' || e.key === 'l') t.z = 0;
    });
  }

  // --- Sensores reais (giroscopio / acelerometro) -------------------------
  // Deve ser chamado a partir de um gesto do usuario (botao "Tocar").
  async enableOrientation() {
    const handler = (e) => {
      if (e.beta == null || e.gamma == null) return;
      // calibra a primeira leitura como postura neutra
      if (this._tiltBaseBeta == null) {
        this._tiltBaseBeta = e.beta;
        this._tiltBaseGamma = e.gamma;
      }
      const beta = (e.beta - this._tiltBaseBeta) * Math.PI / 180;   // frente/tras
      const gamma = (e.gamma - this._tiltBaseGamma) * Math.PI / 180; // esq/dir
      this.tiltX = clamp(beta, -1.2, 1.2);
      this.tiltZ = clamp(gamma, -1.2, 1.2);
      this._orientationEnabled = true;
    };

    // iOS 13+ exige permissao explicita
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') window.addEventListener('deviceorientation', handler);
      } catch (_) { /* negado: usa fallback de teclado */ }
    } else {
      window.addEventListener('deviceorientation', handler);
    }
  }

  recalibrate() { this._tiltBaseBeta = null; this._tiltBaseGamma = null; }

  update() {
    // se nao houver joystick ativo, tenta teclado
    if (this.move.x === 0 && this.move.y === 0) this._pollKeyboard();
    // se nao houver sensor, usa inclinacao por teclado
    if (!this._orientationEnabled) {
      this.tiltX = this._desktopTilt.x;
      this.tiltZ = this._desktopTilt.z;
    }
  }

  get hasSensor() { return this._orientationEnabled; }
}
