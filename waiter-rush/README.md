# Waiter Rush — Desafio dos Copos (Web 3D)

Jogo 3D mobile **jogável no navegador** (Three.js). Você controla um garçom num
restaurante apertado: atende mesas, busca os pedidos no bar/cozinha, **equilibra a
bandeja inclinando o celular** (giroscópio/acelerômetro) e entrega sem derramar.

## Jogar

É só servir a pasta por HTTP (módulos ES não funcionam via `file://`):

```bash
cd waiter-rush
python3 -m http.server 8099
# abra http://localhost:8099 no navegador
```

No **celular** (recomendado): abra a URL publicada (ex.: GitHub Pages),
toque em **COMEÇAR** e autorize os **sensores de movimento**. Incline o aparelho
para equilibrar a bandeja.

No **PC** (sem sensores): `WASD`/setas movem · `Shift` corre · `I/J/K/L` inclinam
a bandeja · o botão laranja faz a ação contextual.

> O Three.js está **vendorizado** em `vendor/three.module.js` — não depende de CDN,
> roda offline.

## Controles e fluxo
1. **Joystick** (canto inferior esquerdo) move o garçom; até a borda = correr.
2. Aproxime-se de um cliente com 🔔 → botão **ATENDER** anota o pedido.
3. Vá ao **BAR** (bebidas) ou **COZINHA** (pratos) → **RETIRAR** coloca os itens
   na bandeja.
4. Leve até a mesa equilibrando → **ENTREGAR**. Quanto mais cheio o copo e mais
   rápido, mais estrelas/gorjeta e maior o **combo**.
5. Depois que o cliente come e paga, a mesa fica suja → **LIMPAR** libera a mesa.

## Sistemas
Movimento (andar/correr) · Câmera 3ª pessoa · Equilíbrio por sensores em 360° ·
Física de deslize (massa/atrito/centro de gravidade) · Líquido que balança e
derrama (reclama <50%, falha <20%) · Ciclo completo do cliente com paciência e
emojis · Fila de espera · Gorjetas por estrelas · Combos x2–x5 · Reputação
(game over em 0) · Eventos aleatórios · 20 níveis de dificuldade crescente.

## Arquivos
```
index.html        # HUD, overlays, importmap do Three.js
css/style.css     # interface (HUD, joystick, overlays)
vendor/three.module.js
js/
  config.js   constantes + 20 níveis + itens/pedidos
  utils.js    helpers
  input.js    joystick + sensores (gyro/acelerômetro) + fallback teclado
  scene.js    construção do restaurante (mesas próximas, corredores estreitos)
  player.js   garçom: movimento, câmera, animação
  tray.js     bandeja: física de deslize + líquidos
  customer.js clientes + gerente de clientes
  ui.js       atualização do HUD
  game.js     estado central, ações, gorjetas, reputação, progressão
  main.js     bootstrap + loop
```
