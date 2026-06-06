// ============================================================================
// Waiter Rush - Desafio dos Copos
// config.js : constantes globais e definicao dos 20 niveis
// ============================================================================

export const CONFIG = {
  // --- Jogador ---
  walkSpeed: 3.2,
  runSpeed: 6.0,
  turnLerp: 0.18,
  playerRadius: 0.45,

  // --- Camera (terceira pessoa atras do garcom) ---
  camDistance: 5.2,
  camHeight: 3.4,
  camLerp: 0.12,

  // --- Bandeja / equilibrio ---
  trayTiltMax: 0.55,        // inclinacao maxima (rad) antes de cair tudo
  trayResponse: 1.6,        // o quanto a inclinacao do device afeta a bandeja
  traySlideAccel: 5.5,      // aceleracao de deslize dos itens (m/s^2 por rad)
  trayFriction: 2.4,        // atrito que segura os itens
  trayRadius: 0.42,         // raio util da bandeja (item cai ao ultrapassar)
  trayDamp: 0.92,

  // --- Liquido ---
  spillRatePerTilt: 26,     // % por segundo por radiano acima do limiar
  spillTiltThreshold: 0.22, // a partir daqui comeca a derramar
  liquidComplainBelow: 50,  // cliente reclama
  liquidFailBelow: 20,      // pedido falhou

  // --- Clientes ---
  patienceSeconds: 30,      // tempo base de paciencia ao sentar
  eatDrinkSeconds: 18,      // tempo base de consumo
  serveRange: 2.2,          // distancia para Atender / Entregar / Limpar
  spawnIntervalBase: 6.5,

  // --- Reputacao ---
  reputationStart: 100,
  reputationMax: 100,
  repGainServe: 4,
  repGainDeliverPerfect: 7,
  repGainClean: 3,
  repLossAngry: 10,
  repLossLeave: 14,
  repLossSpill: 5,

  // --- Economia ---
  basePayPerItem: 8,
  baseTip: 5,
};

// Cada item carregavel na bandeja. liquid=true -> tem nivel de liquido.
export const ITEM_TYPES = {
  copo:    { label: 'Copo',    color: 0x9fd3ff, liquid: true,  radius: 0.10, height: 0.20, mass: 0.4 },
  taca:    { label: 'Taca',    color: 0xd23b5e, liquid: true,  radius: 0.09, height: 0.24, mass: 0.35 },
  garrafa: { label: 'Garrafa', color: 0x2e7d32, liquid: true,  radius: 0.08, height: 0.34, mass: 0.7 },
  xicara:  { label: 'Xicara',  color: 0xffffff, liquid: true,  radius: 0.09, height: 0.13, mass: 0.3 },
  prato:   { label: 'Prato',   color: 0xeeeeee, liquid: false, radius: 0.16, height: 0.05, mass: 0.6 },
};

// Pedidos possiveis (label + item fisico que vai pra bandeja)
export const ORDERS = [
  { name: 'Agua',        item: 'copo' },
  { name: 'Refrigerante',item: 'copo' },
  { name: 'Suco',        item: 'copo' },
  { name: 'Cafe',        item: 'xicara' },
  { name: 'Vinho',       item: 'taca' },
  { name: 'Cerveja',     item: 'garrafa' },
  { name: 'Hamburguer',  item: 'prato' },
  { name: 'Pizza',       item: 'prato' },
  { name: 'Massa',       item: 'prato' },
  { name: 'Sobremesa',   item: 'prato' },
];

// 20 niveis de progressao rapida.
// tables  : numero de mesas ativas no salao
// maxCustomers : clientes simultaneos sentados
// itemsPerOrder: itens por pedido (multiplos pedidos no fim do jogo)
// obstacles: eventos aleatorios ativos
// plates  : libera pratos (comida)
// patience: multiplicador de paciencia (menor = mais dificil)
// spawn   : multiplicador do intervalo de chegada (menor = mais rapido)
export const LEVELS = [
  { n: 1,  tables: 2, maxCustomers: 2, itemsPerOrder: 1, plates: false, obstacles: false, patience: 1.3, spawn: 1.4, target: 5 },
  { n: 2,  tables: 3, maxCustomers: 3, itemsPerOrder: 1, plates: false, obstacles: false, patience: 1.2, spawn: 1.3, target: 6 },
  { n: 3,  tables: 4, maxCustomers: 3, itemsPerOrder: 1, plates: false, obstacles: false, patience: 1.15,spawn: 1.2, target: 7 },
  { n: 4,  tables: 4, maxCustomers: 4, itemsPerOrder: 1, plates: false, obstacles: true,  patience: 1.1, spawn: 1.15,target: 8 },
  { n: 5,  tables: 5, maxCustomers: 4, itemsPerOrder: 2, plates: true,  obstacles: true,  patience: 1.1, spawn: 1.1, target: 9 },
  { n: 6,  tables: 5, maxCustomers: 4, itemsPerOrder: 2, plates: true,  obstacles: true,  patience: 1.05,spawn: 1.05,target: 10 },
  { n: 7,  tables: 6, maxCustomers: 5, itemsPerOrder: 2, plates: true,  obstacles: true,  patience: 1.0, spawn: 1.0, target: 11 },
  { n: 8,  tables: 6, maxCustomers: 5, itemsPerOrder: 2, plates: true,  obstacles: true,  patience: 1.0, spawn: 0.98,target: 12 },
  { n: 9,  tables: 7, maxCustomers: 6, itemsPerOrder: 2, plates: true,  obstacles: true,  patience: 0.95,spawn: 0.95,target: 13 },
  { n: 10, tables: 8, maxCustomers: 6, itemsPerOrder: 3, plates: true,  obstacles: true,  patience: 0.92,spawn: 0.9, target: 14 },
  { n: 11, tables: 8, maxCustomers: 7, itemsPerOrder: 3, plates: true,  obstacles: true,  patience: 0.9, spawn: 0.88,target: 15 },
  { n: 12, tables: 9, maxCustomers: 7, itemsPerOrder: 3, plates: true,  obstacles: true,  patience: 0.88,spawn: 0.85,target: 16 },
  { n: 13, tables: 9, maxCustomers: 8, itemsPerOrder: 3, plates: true,  obstacles: true,  patience: 0.85,spawn: 0.82,target: 17 },
  { n: 14, tables: 10,maxCustomers: 8, itemsPerOrder: 3, plates: true,  obstacles: true,  patience: 0.83,spawn: 0.8, target: 18 },
  { n: 15, tables: 10,maxCustomers: 9, itemsPerOrder: 4, plates: true,  obstacles: true,  patience: 0.8, spawn: 0.78,target: 19 },
  { n: 16, tables: 11,maxCustomers: 9, itemsPerOrder: 4, plates: true,  obstacles: true,  patience: 0.78,spawn: 0.75,target: 20 },
  { n: 17, tables: 11,maxCustomers: 10,itemsPerOrder: 4, plates: true,  obstacles: true,  patience: 0.75,spawn: 0.72,target: 22 },
  { n: 18, tables: 12,maxCustomers: 10,itemsPerOrder: 4, plates: true,  obstacles: true,  patience: 0.72,spawn: 0.7, target: 24 },
  { n: 19, tables: 12,maxCustomers: 11,itemsPerOrder: 5, plates: true,  obstacles: true,  patience: 0.7, spawn: 0.66,target: 26 },
  { n: 20, tables: 12,maxCustomers: 12,itemsPerOrder: 5, plates: true,  obstacles: true,  patience: 0.65,spawn: 0.6, target: 30 },
];

export function getLevel(n) {
  return LEVELS[Math.min(Math.max(n - 1, 0), LEVELS.length - 1)];
}
