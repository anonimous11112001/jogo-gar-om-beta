// ============================================================================
// game.js : gerente central. Estado (dinheiro, reputacao, combo, nivel),
//   acoes contextuais (Atender / Retirar / Entregar / Limpar), gorjetas,
//   reputacao, progressao e eventos aleatorios.
// ============================================================================
import { CONFIG, ITEM_TYPES, getLevel } from './config.js';
import { CState } from './customer.js';
import { clamp, dist2D, rand } from './utils.js';

export class Game {
  constructor({ player, tray, restaurant, customers, ui, input }) {
    this.player = player;
    this.tray = tray;
    this.restaurant = restaurant;
    this.customers = customers;
    this.ui = ui;
    this.input = input;

    this.money = 0;
    this.reputation = CONFIG.reputationStart;
    this.combo = 1;
    this.served = 0;            // pedidos concluidos no nivel
    this.levelNum = 1;
    this.running = false;
    this.over = false;

    this.orders = [];           // [{ id, customer, needed:[itemKey], picked:[bool] }]
    this._nextOrderId = 1;
    this._eventTimer = 8;

    this.ui.onAction(() => this._doAction());
  }

  startLevel(n) {
    this.levelNum = n;
    this.level = getLevel(n);
    this.served = 0;
    this.combo = 1;
    this.orders = [];
    this.restaurant.build(this.level.tables);
    this.player.restaurant = this.restaurant;
    this.customers.restaurant = this.restaurant;
    this.customers.customers.forEach(c => c.dispose());
    this.customers.customers = [];
    this.customers.setLevel(this.level);
    this.running = true;
    this.over = false;
    this.ui.showOverlay('overlay-levelstart', false);
    this.ui.toast('NÍVEL ' + n + ' — Meta: ' + this.level.target + ' pedidos', '#ffcf3f');
  }

  // ---- entrada de eventos do CustomerManager ----
  get customerEvents() {
    return {
      onAbandon: (c) => {
        this.reputation -= CONFIG.repLossLeave;
        this.combo = 1;
        this.ui.toast('Cliente foi embora! −reputação', '#e8443a');
        this._cancelOrder(c);
        this._checkGameOver();
      },
    };
  }

  _orderFor(customer) {
    return this.orders.find(o => o.customer === customer) || null;
  }

  // remove o pedido de um cliente e devolve os itens dele que estavam na bandeja
  _cancelOrder(customer) {
    const order = this._orderFor(customer);
    if (!order) return;
    this.tray.unloadForOrder(order.id);
    this.orders = this.orders.filter(o => o !== order);
  }

  // ---- acao contextual ----
  _bestInteraction() {
    const px = this.player.pos.x, pz = this.player.pos.z;
    const R = CONFIG.serveRange;

    // 1) Descartar lixo: carregando lixo e perto da lixeira
    if (this.tray.hasTrash) {
      const t = this.restaurant.trash;
      if (dist2D(px, pz, t.x, t.z) < R + 0.6)
        return { type: 'dump', label: 'DESCARTAR LIXO', color: '#7f8c8d' };
    }

    // 2) Entregar: pedido de um cliente proximo com todos os itens na bandeja
    for (const order of this.orders) {
      const c = order.customer;
      if (this._orderReady(order) && c.state === CState.ORDERED &&
          dist2D(px, pz, c.pos.x, c.pos.z) < R)
        return { type: 'deliver', label: 'ENTREGAR', color: '#27ae60', order };
    }

    // 3) Retirar no bar/cozinha: existe algum pedido com itens faltando
    const needDrink = this.orders.some(o =>
      o.needed.some((k, i) => !o.picked[i] && ITEM_TYPES[k].liquid));
    const needFood = this.orders.some(o =>
      o.needed.some((k, i) => !o.picked[i] && !ITEM_TYPES[k].liquid));
    const b = this.restaurant.bar, k = this.restaurant.kitchen;
    if (needDrink && dist2D(px, pz, b.x, b.z) < R + 0.6)
      return { type: 'pickup-bar', label: 'RETIRAR BEBIDAS', color: '#2980b9' };
    if (needFood && dist2D(px, pz, k.x, k.z) < R + 0.6)
      return { type: 'pickup-kitchen', label: 'RETIRAR PRATOS', color: '#d35400' };

    // 4) Cobrar: cliente que terminou de comer e está aguardando o troco
    for (const c of this.customers.customers) {
      if (c.state === CState.PAYING && dist2D(px, pz, c.pos.x, c.pos.z) < R)
        return { type: 'collect', label: 'COBRAR', color: '#f1c40f', customer: c };
    }

    // 5) Atender: qualquer cliente esperando por perto (varios pedidos em paralelo)
    {
      const c = this.customers.nearest(px, pz, [CState.WAITING], R);
      if (c && !this._orderFor(c))
        return { type: 'serve', label: 'ATENDER', color: '#ff7a00', customer: c };
    }

    // 6) Limpar: mesa suja por perto (lixo vai para a bandeja)
    for (const t of this.restaurant.tables) {
      if (t.dirty && dist2D(px, pz, t.x, t.z + 1.0) < R) {
        return { type: 'clean', label: 'RECOLHER LIXO', color: '#16a085', table: t };
      }
    }
    return null;
  }

  // pedido pronto = todos os itens ja foram retirados (estao na bandeja)
  _orderReady(order) {
    return order.picked.length > 0 && order.picked.every(Boolean);
  }

  _doAction() {
    const act = this._current;
    if (!act) return;
    if (act.type === 'serve') {
      if (act.customer.takeOrder()) {
        this.orders.push({
          id: this._nextOrderId++,
          customer: act.customer,
          needed: act.customer.order.map(o => o.item),
          picked: act.customer.order.map(() => false),
        });
        const names = act.customer.order.map(o => o.name).join(', ');
        this.ui.toast('Pedido anotado: ' + names, '#ffcf3f');
        this.reputation = clamp(this.reputation + CONFIG.repGainServe, 0, CONFIG.reputationMax);
      }
    } else if (act.type === 'pickup-bar' || act.type === 'pickup-kitchen') {
      const wantLiquid = act.type === 'pickup-bar';
      let any = false;
      // retira os itens (desse tipo) de TODOS os pedidos pendentes de uma vez
      for (const order of this.orders) {
        order.needed.forEach((k, i) => {
          if (!order.picked[i] && ITEM_TYPES[k].liquid === wantLiquid) {
            this.tray.load(k, order.id);
            order.picked[i] = true;
            any = true;
          }
        });
      }
      if (any) this.ui.toast('Itens na bandeja — equilibre!', '#9fd3ff');
    } else if (act.type === 'deliver') {
      this._deliver(act);
    } else if (act.type === 'collect') {
      act.customer.payAndLeave();
      this.reputation = clamp(this.reputation + CONFIG.repGainClean, 0, CONFIG.reputationMax);
      this.ui.toast('Obrigado! Mesa sendo liberada…', '#f1c40f');
    } else if (act.type === 'clean') {
      // recolhe o lixo da mesa para a bandeja; precisa descartar na lixeira
      this.restaurant.cleanTable(act.table);
      this.tray.loadTrash();
      this.ui.toast('Lixo na bandeja — leve até a lixeira! 🗑️', '#16a085');
    } else if (act.type === 'dump') {
      const n = this.tray.unloadTrash();
      if (n > 0) {
        this.reputation = clamp(this.reputation + CONFIG.repGainClean, 0, CONFIG.reputationMax);
        this.ui.toast('Lixo descartado! +reputação', '#16a085');
      }
    }
  }

  _deliver(act) {
    const order = act.order;
    const c = order.customer;
    const delivered = this.tray.unloadForOrder(order.id);
    // qualidade pela media de liquido entregue
    const liqItems = delivered.filter(d => d.liquid >= 0);
    const avgLiq = liqItems.length
      ? liqItems.reduce((s, d) => s + d.liquid, 0) / liqItems.length : 100;

    let failed = avgLiq < CONFIG.liquidFailBelow;
    let stars, tip, pay = CONFIG.basePayPerItem * delivered.length;

    if (failed) {
      stars = 0;
      tip = 0;
      this.combo = 1;
      this.reputation -= CONFIG.repLossSpill * 2;
      this.ui.toast('❌ Pedido falhou! Líquido insuficiente', '#e8443a');
    } else {
      // gorjeta por velocidade (paciencia restante) + liquido
      const patienceFrac = clamp(c.patience / c.patienceMax, 0, 1);
      const quality = (avgLiq / 100) * 0.6 + patienceFrac * 0.4;
      if (quality > 0.8) { stars = 3; }
      else if (quality > 0.55) { stars = 2; }
      else if (quality > 0.3) { stars = 1; }
      else { stars = 0; }
      tip = Math.round(CONFIG.baseTip * stars * this.combo * (0.5 + quality));
      const starStr = '⭐'.repeat(stars) || '❌';
      this.reputation = clamp(this.reputation + CONFIG.repGainDeliverPerfect * (stars / 3), 0, CONFIG.reputationMax);

      if (stars === 3) { this.combo = Math.min(this.combo + 1, 5); }
      else if (stars <= 1) { this.combo = 1; }

      this.ui.toast(`Entregue ${starStr}  +$${pay + tip}` + (this.combo > 1 ? `  COMBO x${this.combo}` : ''),
        '#3ad15a');
    }

    this.money += pay + tip;
    c.receive(delivered);   // cliente comeca a consumir
    this.served++;
    this.orders = this.orders.filter(o => o !== order);

    if (avgLiq < CONFIG.liquidComplainBelow && !failed)
      this.ui.toast('Cliente reclamou do copo quase vazio…', '#e8b923');

    this._checkLevelComplete();
  }

  // ---- eventos aleatorios ----
  _maybeEvent(dt) {
    if (!this.level.obstacles) return;
    this._eventTimer -= dt;
    if (this._eventTimer > 0) return;
    this._eventTimer = rand(10, 18);
    const events = [
      'Criança correndo pelo corredor! 🏃',
      'Outro garçom passando 🤵',
      'Bolsa largada no corredor 👜',
      'Chão molhado à frente 💧',
      'Cliente se levantou de repente!',
    ];
    const e = events[Math.floor(Math.random() * events.length)];
    this.ui.toast('⚠️ ' + e, '#ff9f43');
    // efeito: um tranco na bandeja (desequilibrio momentaneo)
    this.tray.tiltX += rand(-0.25, 0.25);
    this.tray.tiltZ += rand(-0.25, 0.25);
  }

  _checkLevelComplete() {
    if (this.served >= this.level.target) {
      this.running = false;
      if (this.levelNum >= 20) {
        this.ui.showOverlay('overlay-win', true);
      } else {
        document.getElementById('next-level-num').textContent = (this.levelNum + 1);
        this.ui.showOverlay('overlay-levelup', true);
      }
    }
  }

  _checkGameOver() {
    if (this.reputation <= 0 && !this.over) {
      this.reputation = 0;
      this.over = true;
      this.running = false;
      document.getElementById('gameover-stats').textContent =
        `Nível ${this.levelNum} · $${Math.floor(this.money)} · ${this.served} pedidos`;
      this.ui.showOverlay('overlay-gameover', true);
    }
  }

  update(dt) {
    if (!this.running) return;

    // perda lenta de reputacao por clientes irritados ativos
    let angry = 0;
    for (const c of this.customers.customers)
      if (c.mood === 'angry') angry++;
    if (angry) this.reputation -= angry * 1.2 * dt;

    // derramamento penaliza reputacao
    if (this.tray.spilledThisFrame > 0.5) {
      this.reputation -= CONFIG.repLossSpill * dt;
    }
    // item caiu da bandeja
    if (this.tray.droppedItems.length) {
      // marca o item como nao colhido (no pedido dele) para forcar nova retirada
      for (const it of this.tray.droppedItems) {
        if (it.type.trash) continue;  // lixo caido apenas some
        const order = this.orders.find(o => o.id === it.orderId);
        if (order) {
          for (let i = 0; i < order.needed.length; i++) {
            if (order.needed[i] === it.typeKey && order.picked[i]) {
              order.picked[i] = false; break;
            }
          }
        }
      }
      this.combo = 1;
      this.reputation -= 4 * this.tray.droppedItems.length;
      this.ui.toast('💥 Item caiu da bandeja!', '#e8443a');
    }

    this._maybeEvent(dt);
    this._checkGameOver();

    // resolve interacao contextual e atualiza botao
    this._current = this._bestInteraction();
    if (this._current) this.ui.setAction(this._current.label, true, this._current.color);
    else this.ui.setAction('', false);
  }

  get hudState() {
    return {
      money: this.money,
      reputation: this.reputation,
      combo: this.combo,
      level: this.levelNum,
      activeOrders: this.orders.length,
      waitingQueue: this.customers.waitingQueue,
      served: this.served,
      goal: this.level ? this.level.target : 0,
      avgLiquid: this.tray.avgLiquid,
      imbalance: this.tray.imbalance,
      balanceX: clamp(this.tray.tiltZ / CONFIG.trayTiltMax, -1, 1),
    };
  }
}
