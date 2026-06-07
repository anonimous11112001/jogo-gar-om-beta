// ============================================================================
// player.js : o garcom. Movimento por joystick, camera 3a pessoa, estados
//             Idle/Walk/Run (bob procedural). Segura a bandeja a frente.
// ============================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { lerp } from './utils.js';

export class Player {
  constructor(scene, camera, restaurant) {
    this.scene = scene;
    this.camera = camera;
    this.restaurant = restaurant;
    this.pos = new THREE.Vector3(0, 0, 8);
    this.heading = Math.PI;        // direcao para onde o garcom anda (segue o movimento)
    this.camYaw = Math.PI;         // angulo da camera ao redor do garcom (giravel 360)
    this.speed = 0;
    this.state = 'idle';
    this._bob = 0;

    this.group = new THREE.Group();
    this._buildModel();
    scene.add(this.group);

    // ponto onde a bandeja fica (mao ao lado direito, acima)
    this.trayAnchor = new THREE.Object3D();
    this.group.add(this.trayAnchor);
    this.trayAnchor.position.set(0.55, 1.25, 0.0);
  }

  _buildModel() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xe0ac69 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x222222 });

    // tronco
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 8), shirt);
    torso.position.y = 1.05; torso.castShadow = true;
    this.group.add(torso);
    // colete/avental
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.18), pants);
    vest.position.set(0, 1.0, 0.16);
    this.group.add(vest);
    // cabeca
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skin);
    head.position.y = 1.6; head.castShadow = true;
    this.group.add(head);
    // pernas
    this.legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.45, 4, 6), pants);
    this.legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.45, 4, 6), pants);
    this.legL.position.set(-0.14, 0.45, 0); this.legR.position.set(0.14, 0.45, 0);
    this.group.add(this.legL, this.legR);
    // braco que segura a bandeja (lado direito)
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 6), shirt);
    arm.position.set(0.38, 1.1, 0.0); arm.rotation.z = -1.1;
    this.group.add(arm);

    this.group.position.copy(this.pos);
  }

  update(dt, input) {
    // giro da camera ao redor do garcom (independente do movimento)
    this.camYaw += input.consumeLookYaw();

    const m = input.move;
    const mag = Math.hypot(m.x, m.y);

    if (mag > 0.05) {
      // Movimento relativo à câmera: "cima no joystick" = andar para onde a
      // câmera aponta (para longe dela), deixando as costas do garçom para a câmera.
      const wx = -m.x * Math.cos(this.camYaw) - m.y * Math.sin(this.camYaw);
      const wz =  m.x * Math.sin(this.camYaw) - m.y * Math.cos(this.camYaw);
      const targetHeading = Math.atan2(wx, wz);
      // interpola heading pelo caminho mais curto
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * CONFIG.turnLerp;

      const targetSpeed = input.running ? CONFIG.runSpeed : CONFIG.walkSpeed;
      this.speed = lerp(this.speed, targetSpeed * Math.min(mag, 1), 0.2);
      this.state = input.running ? 'run' : 'walk';
    } else {
      this.speed = lerp(this.speed, 0, 0.25);
      this.state = this.speed > 0.3 ? 'walk' : 'idle';
    }

    // mover
    const nx = this.pos.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
    const r = this.restaurant.collide(nx, nz, CONFIG.playerRadius);
    this.pos.x = r.x; this.pos.z = r.z;

    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.y = this.heading;

    // animacao procedural de passos
    const stride = this.state === 'run' ? 14 : 9;
    if (this.speed > 0.3) {
      this._bob += dt * stride;
      this.legL.rotation.x = Math.sin(this._bob) * 0.6;
      this.legR.rotation.x = -Math.sin(this._bob) * 0.6;
      this.group.position.y = Math.abs(Math.sin(this._bob * 2)) * 0.04;
    } else {
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0, 0.2);
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0, 0.2);
      this.group.position.y = lerp(this.group.position.y, 0, 0.2);
    }

    this._updateCamera(dt);
  }

  _updateCamera() {
    const cx = this.pos.x - Math.sin(this.camYaw) * CONFIG.camDistance;
    const cz = this.pos.z - Math.cos(this.camYaw) * CONFIG.camDistance;
    const target = new THREE.Vector3(cx, CONFIG.camHeight, cz);
    this.camera.position.lerp(target, CONFIG.camLerp);
    this.camera.lookAt(this.pos.x, 1.3, this.pos.z);
  }
}
