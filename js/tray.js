// ============================================================================
// tray.js : a bandeja equilibrada pelos sensores do celular.
//   - Inclinacao do device -> inclinacao da bandeja (360 graus).
//   - Itens possuem massa/atrito/centro de gravidade e DESLIZAM.
//   - Item que ultrapassa a borda CAI.
//   - Copos/tacas/garrafas/xicaras tem liquido que balanca e DERRAMA.
// ============================================================================
import * as THREE from 'three';
import { CONFIG, ITEM_TYPES } from './config.js';
import { clamp, lerp } from './utils.js';

class TrayItem {
  constructor(typeKey) {
    this.type = ITEM_TYPES[typeKey];
    this.typeKey = typeKey;
    // posicao local na superficie da bandeja (centro de massa)
    this.ox = 0; this.oz = 0;
    this.vx = 0; this.vz = 0;
    this.fallen = false;
    this.liquid = this.type.liquid ? 100 : -1;  // % ; -1 = nao tem liquido
    this.spilling = false;
    this._buildMesh();
  }

  _buildMesh() {
    const t = this.type;
    this.group = new THREE.Group();
    if (t.liquid) {
      // recipiente translucido
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(t.radius, t.radius * 0.85, t.height, 14),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
      );
      glass.position.y = t.height / 2;
      this.group.add(glass);
      // liquido (altura varia com %)
      this.liquidMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(t.radius * 0.92, t.radius * 0.8, t.height * 0.95, 14),
        new THREE.MeshStandardMaterial({ color: t.color })
      );
      this.group.add(this.liquidMesh);
    } else {
      // prato
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(t.radius, t.radius * 0.7, t.height, 18),
        new THREE.MeshStandardMaterial({ color: t.color })
      );
      plate.position.y = t.height / 2;
      this.group.add(plate);
      const food = new THREE.Mesh(
        new THREE.SphereGeometry(t.radius * 0.55, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xc8732a })
      );
      food.position.y = t.height + 0.04; food.scale.y = 0.6;
      this.group.add(food);
    }
  }

  updateLiquidVisual() {
    if (!this.liquidMesh) return;
    const f = clamp(this.liquid / 100, 0.02, 1);
    this.liquidMesh.scale.y = f;
    this.liquidMesh.position.y = (this.type.height * 0.95 * f) / 2 + 0.01;
  }
}

export class Tray {
  constructor(anchor) {
    this.anchor = anchor;          // Object3D na mao do garcom
    this.group = new THREE.Group();
    anchor.add(this.group);

    // prato da bandeja
    this.plate = new THREE.Mesh(
      new THREE.CylinderGeometry(CONFIG.trayRadius, CONFIG.trayRadius, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0xb0b0b0, metalness: 0.6, roughness: 0.3 })
    );
    this.group.add(this.plate);

    this.items = [];
    this.tiltX = 0; this.tiltZ = 0;   // inclinacao atual aplicada (rad)
    this.spilledThisFrame = 0;
    this.droppedItems = [];           // itens que cairam (evento)
  }

  get itemCount() { return this.items.length; }
  get isEmpty() { return this.items.length === 0; }

  load(typeKey) {
    const item = new TrayItem(typeKey);
    // distribui em circulo para nao sobrepor
    const n = this.items.length;
    const ang = n * 1.7;
    const r = n === 0 ? 0 : Math.min(0.18, 0.08 + n * 0.03);
    item.ox = Math.cos(ang) * r;
    item.oz = Math.sin(ang) * r;
    this.group.add(item.group);
    this.items.push(item);
    return item;
  }

  // Remove e retorna o estado dos itens entregues (para calcular gorjeta).
  unloadAll() {
    const delivered = this.items.map(it => ({
      typeKey: it.typeKey, liquid: it.liquid, fallen: it.fallen,
    }));
    for (const it of this.items) this.group.remove(it.group);
    this.items = [];
    return delivered;
  }

  update(dt, input) {
    this.spilledThisFrame = 0;
    this.droppedItems = [];

    // inclinacao alvo vinda dos sensores (ou teclado)
    const tx = clamp(input.tiltX * CONFIG.trayResponse, -CONFIG.trayTiltMax * 1.5, CONFIG.trayTiltMax * 1.5);
    const tz = clamp(input.tiltZ * CONFIG.trayResponse, -CONFIG.trayTiltMax * 1.5, CONFIG.trayTiltMax * 1.5);
    this.tiltX = lerp(this.tiltX, tx, 0.2);
    this.tiltZ = lerp(this.tiltZ, tz, 0.2);

    // aplica inclinacao visual a bandeja
    this.group.rotation.x = this.tiltX;
    this.group.rotation.z = -this.tiltZ;

    const tiltMag = Math.hypot(this.tiltX, this.tiltZ);

    for (const it of this.items) {
      if (it.fallen) continue;
      // aceleracao por gravidade na superficie inclinada (centro de gravidade)
      // tiltZ -> desliza em x ; tiltX -> desliza em z
      const ax = Math.sin(this.tiltZ) * CONFIG.traySlideAccel;
      const az = -Math.sin(this.tiltX) * CONFIG.traySlideAccel;
      // atrito proporcional a massa
      const fr = CONFIG.trayFriction * it.type.mass;
      it.vx += ax * dt;
      it.vz += az * dt;
      // aplica atrito (freia)
      const sp = Math.hypot(it.vx, it.vz);
      if (sp > 0) {
        const drop = Math.min(sp, fr * dt);
        it.vx -= (it.vx / sp) * drop;
        it.vz -= (it.vz / sp) * drop;
      }
      it.ox += it.vx * dt;
      it.oz += it.vz * dt;

      // caiu da bandeja?
      const rad = Math.hypot(it.ox, it.oz);
      if (rad > CONFIG.trayRadius - it.type.radius * 0.5) {
        it.fallen = true;
        this.droppedItems.push(it);
        // anima a queda (some pra baixo)
        it.group.visible = true;
        continue;
      }

      // posiciona o mesh
      it.group.position.set(it.ox, 0.02, it.oz);
      it.group.rotation.x = -this.tiltX * 0.6;
      it.group.rotation.z = this.tiltZ * 0.6;

      // --- liquido: balanca e derrama ---
      if (it.liquid >= 0) {
        if (tiltMag > CONFIG.spillTiltThreshold && it.liquid > 0) {
          const over = tiltMag - CONFIG.spillTiltThreshold;
          const spill = over * CONFIG.spillRatePerTilt * dt;
          it.liquid = Math.max(0, it.liquid - spill);
          this.spilledThisFrame += spill;
          it.spilling = true;
        } else {
          it.spilling = false;
        }
        it.updateLiquidVisual();
      }
    }

    // remove itens caidos do palco apos marcar
    for (const it of this.droppedItems) {
      this.group.remove(it.group);
      const idx = this.items.indexOf(it);
      if (idx >= 0) this.items.splice(idx, 1);
    }
  }

  // nivel medio de liquido (para HUD)
  get avgLiquid() {
    const liq = this.items.filter(i => i.liquid >= 0);
    if (!liq.length) return -1;
    return liq.reduce((s, i) => s + i.liquid, 0) / liq.length;
  }

  // magnitude de desequilibrio 0..1 (para o indicador de EQUILIBRIO)
  get imbalance() {
    return clamp(Math.hypot(this.tiltX, this.tiltZ) / CONFIG.trayTiltMax, 0, 1);
  }
}
