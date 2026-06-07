// ============================================================================
// main.js : inicializa Three.js, monta tudo e roda o loop do jogo.
// ============================================================================
import * as THREE from 'three';
import { Restaurant } from './scene.js';
import { Player } from './player.js';
import { Tray } from './tray.js';
import { CustomerManager } from './customer.js';
import { InputManager } from './input.js';
import { UI } from './ui.js';
import { Game } from './game.js';

// --- Renderer / cena / camera ---
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14100e);
scene.fog = new THREE.Fog(0x14100e, 14, 30);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 4, 14);

// luzes (ambiente quente de restaurante)
scene.add(new THREE.HemisphereLight(0xffe8c0, 0x402a1a, 0.8));
const key = new THREE.DirectionalLight(0xfff0d0, 1.1);
key.position.set(6, 12, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -14; key.shadow.camera.right = 14;
key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
scene.add(key);
// lustres
for (const [x, z] of [[-4, -4], [4, -4], [0, 2], [-4, 4], [4, 4]]) {
  const p = new THREE.PointLight(0xffcf8f, 0.5, 9);
  p.position.set(x, 3.2, z);
  scene.add(p);
}

// --- Entidades ---
const restaurant = new Restaurant(scene);
restaurant.build(2);
const player = new Player(scene, camera, restaurant);
const tray = new Tray(player.trayAnchor);
const customers = new CustomerManager(scene, restaurant);
const input = new InputManager();
const ui = new UI();
const game = new Game({ player, tray, restaurant, customers, ui, input });

// --- Botoes de overlay ---
const $ = (id) => document.getElementById(id);

$('start-btn')?.addEventListener('click', async () => {
  await input.enableOrientation();   // pede sensores no gesto do usuario
  ui.showOverlay('overlay-start', false);
  game.startLevel(1);
});
$('sensor-btn')?.addEventListener('click', async () => {
  await input.enableOrientation();
  input.recalibrate();
  ui.toast(input.hasSensor ? 'Sensores ativos — recalibrado' : 'Sem sensor: use I/J/K/L', '#9fd3ff');
});
$('next-level-btn')?.addEventListener('click', () => {
  ui.showOverlay('overlay-levelup', false);
  game.startLevel(game.levelNum + 1);
});
$('restart-btn')?.addEventListener('click', () => {
  ui.showOverlay('overlay-gameover', false);
  game.money = 0; game.reputation = 100; game.over = false;
  game.startLevel(1);
});
$('win-restart-btn')?.addEventListener('click', () => {
  ui.showOverlay('overlay-win', false);
  game.money = 0; game.reputation = 100; game.over = false;
  game.startLevel(1);
});

// --- Resize / orientacao ---
// Em retrato (celular de pe) a tela e estreita: alargamos o FOV e afastamos a
// camera para nao ficar com zoom excessivo e perder a visao do salao.
function applyViewport() {
  const w = window.innerWidth, h = window.innerHeight;
  const aspect = w / h;
  camera.aspect = aspect;
  const portrait = h > w;
  camera.fov = portrait ? 74 : 60;
  player.camDistMul = portrait ? 1.5 : 1.0;
  player.camHeightMul = portrait ? 1.15 : 1.0;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', applyViewport);
window.addEventListener('orientationchange', applyViewport);
applyViewport();

// --- Loop ---
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  input.update();

  if (game.running) {
    player.update(dt, input);
    tray.update(dt, input);
    customers.update(dt, game.customerEvents);
    game.update(dt);
  }
  ui.update(game.hudState, dt);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// expoe para debug no console
window.WAITER = { game, player, tray, customers, input, restaurant };
