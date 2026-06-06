// ============================================================================
// ui.js : atualiza o HUD (dinheiro, reputacao, pedidos, combo, nivel,
//          liquido, equilibrio) e o botao de acao contextual.
// ============================================================================
export class UI {
  constructor() {
    this.el = {
      money: document.getElementById('hud-money'),
      rep: document.getElementById('hud-rep-fill'),
      repVal: document.getElementById('hud-rep-val'),
      level: document.getElementById('hud-level'),
      combo: document.getElementById('hud-combo'),
      orders: document.getElementById('hud-orders'),
      waiting: document.getElementById('hud-waiting'),
      goal: document.getElementById('hud-goal'),
      liquid: document.getElementById('hud-liquid-fill'),
      liquidWrap: document.getElementById('hud-liquid'),
      balance: document.getElementById('balance-needle'),
      balanceBar: document.getElementById('balance-bar'),
      action: document.getElementById('action-btn'),
      toast: document.getElementById('toast'),
      sensorBtn: document.getElementById('sensor-btn'),
    };
    this._toastTimer = 0;
  }

  setAction(label, visible, color = '#ff7a00') {
    const b = this.el.action;
    if (!b) return;
    b.style.display = visible ? 'flex' : 'none';
    if (visible) { b.textContent = label; b.style.background = color; }
  }

  onAction(cb) { this.el.action?.addEventListener('click', cb); }

  toast(msg, color = '#fff') {
    const t = this.el.toast;
    if (!t) return;
    t.textContent = msg;
    t.style.color = color;
    t.style.opacity = '1';
    t.style.transform = 'transl(-50%, 0) scale(1.05)';
    this._toastTimer = 1.6;
  }

  update(state, dt) {
    const e = this.el;
    if (e.money) e.money.textContent = '💰 ' + Math.floor(state.money);
    if (e.repVal) e.repVal.textContent = Math.floor(state.reputation) + '%';
    if (e.rep) {
      e.rep.style.width = state.reputation + '%';
      e.rep.style.background = state.reputation > 50 ? '#3ad15a'
        : state.reputation > 25 ? '#e8b923' : '#e8443a';
    }
    if (e.level) e.level.textContent = 'NÍVEL ' + state.level;
    if (e.combo) {
      e.combo.textContent = state.combo > 1 ? 'COMBO x' + state.combo : '';
      e.combo.style.opacity = state.combo > 1 ? '1' : '0';
    }
    if (e.orders) e.orders.textContent = '📋 ' + state.activeOrders;
    if (e.waiting) e.waiting.textContent = '🚪 ' + state.waitingQueue;
    if (e.goal) e.goal.textContent = state.served + '/' + state.goal;

    // liquido carregado
    if (e.liquidWrap) {
      if (state.avgLiquid >= 0) {
        e.liquidWrap.style.display = 'block';
        e.liquid.style.width = state.avgLiquid + '%';
        e.liquid.style.background = state.avgLiquid > 50 ? '#3aa0d1'
          : state.avgLiquid > 20 ? '#e8b923' : '#e8443a';
      } else {
        e.liquidWrap.style.display = 'none';
      }
    }

    // indicador de equilibrio: agulha de -1..1
    if (e.balance) {
      const off = state.balanceX * 50;  // %
      e.balance.style.left = (50 + off) + '%';
      const bad = state.imbalance > 0.6;
      e.balance.style.background = bad ? '#e8443a' : (state.imbalance > 0.35 ? '#e8b923' : '#3ad15a');
    }

    // toast fade
    if (this._toastTimer > 0) {
      this._toastTimer -= dt;
      if (this._toastTimer <= 0) e.toast.style.opacity = '0';
    }
  }

  showOverlay(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
  }
}
