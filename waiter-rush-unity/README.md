# Waiter Rush — Desafio dos Copos (Unity / C#)

Versão **Unity** do jogo. Os scripts em `Assets/Scripts/` implementam todos os
sistemas do MVP descritos no prompt. Este pacote contém **somente código C#** e a
configuração mínima do projeto — as cenas, prefabs e assets visuais são montados
dentro do Unity Editor seguindo o guia abaixo.

> 💡 Quer jogar **agora**, sem montar nada? Use a versão web em `../waiter-rush/`
> (Three.js, roda no navegador do celular com os sensores reais). Esta pasta é a
> base equivalente em Unity para evoluir com gráficos/assets nativos.

## Requisitos
- Unity **2022.3 LTS** (ou 2021.3+). C# 9 (switch expressions / pattern matching).
- Módulos Android e/ou iOS Build Support.

## Estrutura dos scripts

```
Assets/Scripts/
├── Systems/
│   ├── GameConfig.cs        # constantes de balanceamento + tabela de itens
│   ├── LevelManager.cs      # os 20 níveis de progressão
│   ├── ActiveOrder.cs       # pedido em montagem (itens a retirar)
│   ├── GameManager.cs       # estado central: dinheiro, reputação, combo, gorjeta
│   └── GameBootstrap.cs     # liga os botões de UI ao jogo
├── Gameplay/
│   ├── PlayerController.cs       # joystick + câmera 3ª pessoa + animações
│   ├── TrayController.cs         # EQUILÍBRIO via giroscópio/acelerômetro
│   ├── TrayItem.cs               # física do item + nível de líquido
│   ├── Customer.cs              # ciclo de vida do cliente
│   ├── CustomerManager.cs       # spawn, fila de espera, limpeza
│   ├── Table.cs                 # ocupação e sujeira
│   ├── RestaurantBuilder.cs     # salão apertado (mesas próximas)
│   └── InteractionController.cs # Atender / Retirar / Entregar / Limpar
└── UI/
    ├── VirtualJoystick.cs    # joystick virtual (uGUI)
    └── HUDManager.cs         # HUD + toasts + painéis
```

## Como montar a cena (passo a passo)

1. **Criar o projeto** Unity 2022.3 (template 3D) e copiar a pasta `Assets/Scripts`.
2. **Restaurante**
   - Crie um `Plane` grande como chão; 4 cubos como paredes.
   - Um GameObject `Bar` (cubo) à esquerda e `Cozinha` à direita.
   - Um GameObject vazio `Entrance` na porta principal.
3. **Prefab de Mesa** (`Table`)
   - Cilindro (tampo) + cilindro fino (perna). Adicione `Table.cs`.
   - Filho vazio `Seat` à frente da mesa → arraste em `Table.seat`.
   - (Opcional) `dirtyPrefab` = um pequeno prefab de louças sujas.
4. **Prefab do Garçom** (`Player`)
   - Capsule + `CharacterController` + `PlayerController.cs`.
   - Filho `TrayAnchor` na altura da mão (ex.: `(0, 1.25, 0.55)`).
   - (Opcional) `Animator` com estados Idle/Walk/Run e parâmetros
     `Speed` (float) e `Running` (bool).
5. **Bandeja**
   - GameObject `Tray` filho de `TrayAnchor` com `TrayController.cs`.
   - Filho `Surface` (cilindro achatado) → `TrayController.surface`.
   - **Prefabs de itens** (copo/taça/garrafa/xícara/prato): cada um com
     `TrayItem.cs`; nos que têm líquido, um cilindro filho como `liquidVisual`.
     Arraste os 5 prefabs nos campos do `TrayController`.
6. **Câmera**
   - Crie um `CameraRig` (vazio) com a `Main Camera` filha.
   - Arraste `CameraRig` em `PlayerController.cameraRig`.
7. **UI (Canvas, Screen Space - Overlay)**
   - `VirtualJoystick`: imagem de fundo + knob → `VirtualJoystick.cs`
     (arraste `background` e `knob`). Ligue em `PlayerController.joystick`.
   - Botão de ação grande (laranja) → no `OnClick` chame
     `InteractionController.DoAction`.
   - Textos/barras do HUD → arraste em `HUDManager`.
   - Painéis `Start`, `LevelUp`, `GameOver`, `Win` (Panels) → `HUDManager`.
8. **Managers (GameObjects vazios)**
   - `GameManager` (`GameManager.cs`): arraste player, tray, customers,
     restaurant, hud.
   - `CustomerManager` (`CustomerManager.cs`): `customerPrefab`, `restaurant`,
     `entrance`.
   - `RestaurantBuilder` (`RestaurantBuilder.cs`): `tablePrefab`, `tablesRoot`,
     `bar`, `kitchen`.
   - `InteractionController`: player, customers, restaurant, hud.
   - `GameBootstrap`: game, tray, hud, panelStart. Ligue os botões dos painéis
     aos métodos `OnStart`, `OnNextLevel`, `OnRestart`, `OnRecalibrate`.
9. **Cliente** prefab: Capsule + `Customer.cs` + um filho `marker` com
   `TextMesh` (`markerText`) para o ícone 🔔/😐/😠/🍽️/💵.

## Sensores (equilíbrio da bandeja)
`TrayController` usa **acelerômetro** (`Input.acceleration`) como fonte principal
da inclinação física e **giroscópio** (`Input.gyro`) para refinar a resposta —
**sem bússola**, conforme o prompt. Chame `Recalibrate()` (botão de engrenagem ou
ao iniciar) para definir a postura neutra do aparelho. Em Android, ative o
giroscópio em *Project Settings → Player*.

## Sistemas implementados (MVP)
Movimento (joystick + correr) · Câmera 3ª pessoa · Equilíbrio por sensores em
360° · Física de deslize (massa/atrito/centro de gravidade) · Líquido que balança
e derrama (reclama <50%, falha <20%) · Ciclo do cliente (entra→senta→pede→consome→
paga→sai) com paciência e emojis · Fila de espera · Pedidos no bar/cozinha ·
Entrega com gorjeta por estrelas · Combos x2–x5 · Reputação (game over em 0) ·
Limpeza de mesa · Eventos aleatórios (via `GameManager`/obstáculos do nível) ·
20 níveis de progressão.
