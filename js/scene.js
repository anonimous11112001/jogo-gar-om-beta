// ============================================================================
// scene.js : monta o restaurante 3D (salao apertado, corredores estreitos),
//            cozinha, bar e entrada. Gera as mesas conforme o nivel.
// ============================================================================
import * as THREE from 'three';

export class Restaurant {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.tables = [];     // { mesh, x, z, occupiedBy, dirty }
    this.colliders = [];  // AABBs para colisao do jogador { minX,maxX,minZ,maxZ }
    this.bar = { x: -7.5, z: -8 };       // ponto de retirada de bebidas
    this.kitchen = { x: 7.5, z: -8 };    // ponto de retirada de comidas
    this.entrance = { x: 0, z: 9.5 };    // porta principal / fila
    this.trash = { x: 9, z: 2 };         // lixeira (lateral direita do salao)
  }

  // Constroi o salao para um numero de mesas. Mesas proximas + corredores estreitos.
  build(tableCount) {
    this._clear();
    const g = this.group;

    // chao
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a2a22 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);

    // tapete central para dar cor
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: 0x5a2d2d })
    );
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01;
    g.add(rug);

    // paredes
    this._wall(0, -12, 24, 0.4, 0x6b4a3a);
    this._wall(0, 12, 24, 0.4, 0x6b4a3a);
    this._wall(-12, 0, 0.4, 24, 0x6b4a3a);
    this._wall(12, 0, 0.4, 24, 0x6b4a3a);

    // zonas: bar (esq) e cozinha (dir)
    this._zone(this.bar.x, this.bar.z, 0x335a8a, 'BAR');
    this._zone(this.kitchen.x, this.kitchen.z, 0x8a5a33, 'COZINHA');

    // lixeira (lateral direita) - descarte de lixo
    this._bin(this.trash.x, this.trash.z);

    // entrada (marca no chao)
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    door.rotation.x = -Math.PI / 2; door.position.set(this.entrance.x, 0.02, this.entrance.z);
    g.add(door);

    // --- Mesas em grade apertada -------------------------------------------
    // Espacamento curto = corredores estreitos = tensao constante.
    const cols = Math.min(4, Math.ceil(Math.sqrt(tableCount)));
    const rows = Math.ceil(tableCount / cols);
    const spacingX = 3.0;   // proximas umas das outras
    const spacingZ = 3.0;
    const startX = -((cols - 1) * spacingX) / 2;
    const startZ = -2.5;

    let made = 0;
    for (let r = 0; r < rows && made < tableCount; r++) {
      for (let c = 0; c < cols && made < tableCount; c++) {
        const x = startX + c * spacingX;
        const z = startZ + r * spacingZ;
        this._table(x, z);
        made++;
      }
    }
    return this.tables;
  }

  _table(x, z) {
    const grp = new THREE.Group();
    // tampo
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x8d6e4f })
    );
    top.position.y = 0.95; top.castShadow = true;
    grp.add(top);
    // perna
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.95, 8),
      new THREE.MeshStandardMaterial({ color: 0x5d4636 })
    );
    leg.position.y = 0.47;
    grp.add(leg);
    grp.position.set(x, 0, z);
    this.group.add(grp);

    const table = {
      mesh: grp, x, z, seatX: x, seatZ: z + 1.1,
      occupiedBy: null, dirty: false, dirtyMeshes: [],
    };
    this.tables.push(table);

    // colisao: a mesa bloqueia (raio ~0.85 -> AABB)
    this.colliders.push({ minX: x - 0.85, maxX: x + 0.85, minZ: z - 0.85, maxZ: z + 0.85 });
  }

  // Marca a mesa como suja (deixa loucas/lixo). Retorna meshes para remover na limpeza.
  setDirty(table) {
    table.dirty = true;
    const colors = [0xeeeeee, 0x9fd3ff, 0x888888];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: colors[i] })
      );
      m.position.set(table.x + (i - 1) * 0.2, 1.04, table.z);
      this.group.add(m);
      table.dirtyMeshes.push(m);
    }
  }

  cleanTable(table) {
    table.dirty = false;
    for (const m of table.dirtyMeshes) this.group.remove(m);
    table.dirtyMeshes = [];
  }

  _wall(x, z, w, d, color) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(w, 3, d),
      new THREE.MeshStandardMaterial({ color })
    );
    wall.position.set(x, 1.5, z);
    wall.receiveShadow = true;
    this.group.add(wall);
    this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  _bin(x, z) {
    const grp = new THREE.Group();
    // corpo da lixeira
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.38, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: 0x2f3b2f, metalness: 0.3, roughness: 0.7 })
    );
    body.position.y = 0.5; body.castShadow = true;
    grp.add(body);
    // tampa
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0x1f8a4c })
    );
    lid.position.y = 1.06;
    grp.add(lid);
    grp.position.set(x, 0, z);
    this.group.add(grp);
    // colisao
    this.colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
  }

  _zone(x, z, color, label) {
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 1.1, 1.4),
      new THREE.MeshStandardMaterial({ color })
    );
    counter.position.set(x, 0.55, z);
    counter.castShadow = true;
    this.group.add(counter);
    this.colliders.push({ minX: x - 1.75, maxX: x + 1.75, minZ: z - 0.7, maxZ: z + 0.7 });
  }

  _clear() {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.geometry?.dispose?.();
      this.group.remove(c);
    }
    this.tables = [];
    this.colliders = [];
  }

  // Resolve colisao por AABB simples: empurra (x,z) para fora dos colliders.
  collide(x, z, radius) {
    for (const c of this.colliders) {
      const nx = Math.max(c.minX, Math.min(x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - nx, dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        const d = Math.sqrt(d2) || 0.0001;
        const push = (radius - d);
        x += (dx / d) * push;
        z += (dz / d) * push;
      }
    }
    // manter dentro das paredes
    x = Math.max(-11.4, Math.min(11.4, x));
    z = Math.max(-11.4, Math.min(11.4, z));
    return { x, z };
  }
}
