// ============================================================================
// customer.js : ciclo de vida do cliente e o gerente de clientes.
//   entra -> caminha ate a mesa -> senta -> espera atendimento (paciencia)
//   -> pede -> espera entrega -> consome -> paga (deixa $ e sujeira) -> sai
// ============================================================================
import * as THREE from 'three';
import { CONFIG, ORDERS } from './config.js';
import { lerp, pick, rand, dist2D } from './utils.js';

export const CState = {
  ENTERING: 'entering',
  TO_TABLE: 'to_table',
  WAITING: 'waiting',      // sentado, quer ser atendido (toca sino)
  ORDERED: 'ordered',      // pediu, esperando o prato/bebida
  EATING: 'eating',
  PAYING: 'paying',        // deixou tudo na mesa, esperando ir embora
  LEAVING: 'leaving',
  GONE: 'gone',
};

let _id = 0;

export class Customer {
  constructor(scene, table, level) {
    this.id = ++_id;
    this.scene = scene;
    this.table = table;
    this.level = level;
    this.state = CState.ENTERING;
    this.pos = new THREE.Vector3(0, 0, 9.5);   // entra pela porta
    this.target = new THREE.Vector3(table.seatX, 0, table.seatZ);
    this.patience = CONFIG.patienceSeconds * level.patience;
    this.patienceMax = this.patience;
    this.timer = 0;
    this.order = this._makeOrder();
    this.delivered = null;     // resultado da entrega (para calcular gorjeta)
    this.mood = 'happy';

    this._build();
  }

  _makeOrder() {
    const pool = this.level.plates ? ORDERS : ORDERS.filter(o => o.item !== 'prato');
    const items = [];
    for (let i = 0; i < this.level.itemsPerOrder; i++) items.push(pick(pool));
    return items;   // array de { name, item }
  }

  _build() {
    const c = pick([0x4477aa, 0xaa4466, 0x44aa77, 0xaa8833, 0x7755aa]);
    this.group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.26, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: c })
    );
    body.position.y = 1.0; body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe0ac69 })
    );
    head.position.y = 1.55;
    this.group.add(body, head);
    this.group.position.copy(this.pos);
    this.scene.add(this.group);

    // marcador flutuante (sino / emoji) - sprite com canvas
    this.markCanvas = document.createElement('canvas');
    this.markCanvas.width = 128; this.markCanvas.height = 128;
    this.markTex = new THREE.CanvasTexture(this.markCanvas);
    this.markSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markTex, transparent: true }));
    this.markSprite.scale.set(0.8, 0.8, 0.8);
    this.markSprite.position.y = 2.1;
    this.group.add(this.markSprite);
    this._drawMark('');
  }

  _drawMark(emoji, color = '#ffffff') {
    const ctx = this.markCanvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    if (emoji) {
      ctx.font = '90px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(emoji, 64, 64);
    }
    this.markTex.needsUpdate = true;
  }

  // chamado pelo jogador ao apertar ATENDER
  takeOrder() {
    if (this.state !== CState.WAITING) return false;
    this.state = CState.ORDERED;
    this.timer = 0;
    this._drawMark('📝');
    return true;
  }

  // chamado ao ENTREGAR. delivered = array de itens da bandeja entregues.
  receive(delivered) {
    if (this.state !== CState.ORDERED) return false;
    this.delivered = delivered;
    this.state = CState.EATING;
    this.timer = CONFIG.eatDrinkSeconds * rand(0.85, 1.15);
    this._drawMark('🍽️');
    return true;
  }

  update(dt) {
    switch (this.state) {
      case CState.ENTERING:
      case CState.TO_TABLE:
        this._walkTo(this.target, dt, () => {
          this.state = CState.WAITING;
          this.timer = 0;
          this._drawMark('🔔');
        });
        if (this.state === CState.ENTERING) this.state = CState.TO_TABLE;
        break;

      case CState.WAITING: {
        this.patience -= dt;
        const f = this.patience / this.patienceMax;
        if (f > 0.6) { this.mood = 'happy'; this._drawMark('🔔'); }
        else if (f > 0.3) { this.mood = 'impatient'; this._drawMark('😐'); }
        else if (f > 0) { this.mood = 'angry'; this._drawMark('😠'); }
        if (this.patience <= 0) {
          this.mood = 'leaving';
          this._drawMark('🤬');
          this.state = CState.LEAVING;
          this.target.set(CONFIG._entranceX ?? 0, 0, 9.8);
          this.abandoned = true;
        }
        break;
      }

      case CState.ORDERED:
        // esperando a entrega; tambem perde um pouco de paciencia
        this.patience -= dt * 0.6;
        if (this.patience <= 0) {
          this._drawMark('🤬'); this.state = CState.LEAVING;
          this.target.set(0, 0, 9.8); this.abandoned = true;
        }
        break;

      case CState.EATING:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = CState.PAYING;
          this._drawMark('💵', '#7CFC00');
          this.readyToPay = true;
        }
        break;

      case CState.LEAVING:
        this._walkTo(this.target, dt, () => { this.state = CState.GONE; });
        break;
    }

    // marcador sempre de frente (billboard pelo Sprite ja faz isso)
  }

  // chamado pelo jogo ao limpar a mesa -> cliente vai embora satisfeito
  payAndLeave() {
    if (this.state !== CState.PAYING) return;
    this.state = CState.LEAVING;
    this.target.set(0, 0, 9.8);
  }

  _walkTo(target, dt, onArrive) {
    const d = dist2D(this.pos.x, this.pos.z, target.x, target.z);
    if (d < 0.15) { onArrive(); return; }
    const sp = 2.4;
    const dx = (target.x - this.pos.x) / d, dz = (target.z - this.pos.z) / d;
    this.pos.x += dx * sp * dt;
    this.pos.z += dz * sp * dt;
    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.y = Math.atan2(dx, dz);
  }

  dispose() { this.scene.remove(this.group); }
}

export class CustomerManager {
  constructor(scene, restaurant) {
    this.scene = scene;
    this.restaurant = restaurant;
    this.customers = [];
    this.spawnTimer = 2;
    this.level = null;
    this.waitingQueue = 0;   // clientes na fila (mesas cheias)
  }

  setLevel(level) {
    this.level = level;
    this.spawnTimer = 2;
  }

  freeTables() {
    return this.restaurant.tables.filter(t => !t.occupiedBy && !t.dirty);
  }

  spawn() {
    const free = this.freeTables();
    if (!free.length) { this.waitingQueue = Math.min(this.waitingQueue + 1, 6); return; }
    const table = pick(free);
    const c = new Customer(this.scene, table, this.level);
    table.occupiedBy = c;
    this.customers.push(c);
    if (this.waitingQueue > 0) this.waitingQueue--;
  }

  update(dt, events) {
    // chegada de novos clientes
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const seated = this.customers.filter(c =>
        [CState.WAITING, CState.ORDERED, CState.EATING, CState.PAYING].includes(c.state)).length;
      if (seated < this.level.maxCustomers) this.spawn();
      this.spawnTimer = CONFIG.spawnIntervalBase * this.level.spawn * rand(0.8, 1.2);
    }

    for (const c of this.customers) {
      const prev = c.state;
      c.update(dt);
      // disparou abandono?
      if (c.abandoned && !c._counted) {
        c._counted = true;
        events.onAbandon(c);
        if (c.table.occupiedBy === c) c.table.occupiedBy = null;
      }
    }

    // limpa clientes que sairam
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      if (c.state === CState.GONE) {
        if (c.table.occupiedBy === c) {
          // se pagou, a mesa fica suja ate limpar
          if (!c.abandoned) this.restaurant.setDirty(c.table);
          c.table.occupiedBy = null;
        }
        c.dispose();
        this.customers.splice(i, 1);
      }
    }
  }

  // cliente sentado mais proximo de (x,z) num certo estado
  nearest(x, z, states, range) {
    let best = null, bestD = range;
    for (const c of this.customers) {
      if (!states.includes(c.state)) continue;
      const d = dist2D(x, z, c.pos.x, c.pos.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  get activeCount() {
    return this.customers.filter(c =>
      [CState.WAITING, CState.ORDERED, CState.EATING].includes(c.state)).length;
  }
}
