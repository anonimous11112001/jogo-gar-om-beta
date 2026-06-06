using System;
using UnityEngine;

namespace WaiterRush
{
    // Estado central do jogo + reputacao, combo e gorjetas.
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public GameConfig config = new();

        [Header("Referencias de cena")]
        public PlayerController player;
        public TrayController tray;
        public CustomerManager customers;
        public RestaurantBuilder restaurant;
        public HUDManager hud;

        // Estado
        public float Money { get; private set; }
        public float Reputation { get; private set; }
        public int Combo { get; private set; } = 1;
        public int Served { get; private set; }
        public int LevelNum { get; private set; } = 1;
        public LevelData Level { get; private set; }
        public bool Running { get; private set; }

        // pedido sendo montado/carregado (um por vez no MVP)
        public ActiveOrder Order { get; private set; }

        public event Action<string, Color> OnToast;

        void Awake()
        {
            Instance = this;
            Reputation = config.reputationStart;
        }

        public void StartLevel(int n)
        {
            LevelNum = n;
            Level = LevelManager.Get(n);
            Served = 0;
            Combo = 1;
            Order = null;
            restaurant.Build(Level.tables);
            customers.SetLevel(Level);
            Running = true;
            Toast($"NÍVEL {n} — Meta: {Level.target} pedidos", new Color(1f, .81f, .25f));
        }

        public void Toast(string msg, Color color) => OnToast?.Invoke(msg, color);

        // ---- Acoes contextuais (chamadas pela UI / InteractionController) ----

        public void TakeOrder(Customer c)
        {
            if (Order != null || !c.TakeOrder()) return;
            Order = new ActiveOrder(c);
            Reputation = Mathf.Min(Reputation + config.repGainServe, config.reputationMax);
            Toast("Pedido anotado: " + c.OrderSummary(), new Color(1f, .81f, .25f));
        }

        public void PickUp(bool drinksZone)
        {
            if (Order == null) return;
            bool any = false;
            for (int i = 0; i < Order.Needed.Count; i++)
            {
                if (Order.Picked[i]) continue;
                if (ItemDB.HasLiquid(Order.Needed[i]) == drinksZone)
                {
                    tray.Load(Order.Needed[i]);
                    Order.Picked[i] = true;
                    any = true;
                }
            }
            if (any) Toast("Itens na bandeja — equilibre!", new Color(.62f, .83f, 1f));
        }

        public void Deliver()
        {
            if (Order == null || !Order.IsReady(tray)) return;
            Customer c = Order.Customer;
            var delivered = tray.UnloadAll();

            float avgLiq = 100f; int liqCount = 0; float sum = 0;
            foreach (var d in delivered)
                if (d.hasLiquid) { sum += d.liquid; liqCount++; }
            if (liqCount > 0) avgLiq = sum / liqCount;

            int pay = config.basePayPerItem * delivered.Count;
            int tip = 0;

            if (avgLiq < config.liquidFailBelow)
            {
                // pedido falhou: paga so o basico, sem gorjeta
                Combo = 1;
                Reputation -= config.repLossSpill * 2f;
                Toast("❌ Pedido falhou! Líquido insuficiente", new Color(.91f, .27f, .23f));
            }
            else
            {
                float patienceFrac = Mathf.Clamp01(c.PatienceFraction);
                float quality = (avgLiq / 100f) * 0.6f + patienceFrac * 0.4f;
                int stars = quality > 0.8f ? 3 : quality > 0.55f ? 2 : quality > 0.3f ? 1 : 0;
                tip = Mathf.RoundToInt(config.baseTip * stars * Combo * (0.5f + quality));
                Reputation = Mathf.Min(Reputation + config.repGainDeliverPerfect * (stars / 3f), config.reputationMax);
                if (stars == 3) Combo = Mathf.Min(Combo + 1, 5);
                else if (stars <= 1) Combo = 1;

                string starStr = stars > 0 ? new string('★', stars) : "❌";
                Toast($"Entregue {starStr}  +${pay + tip}" + (Combo > 1 ? $"  COMBO x{Combo}" : ""),
                      new Color(.23f, .82f, .35f));
                if (avgLiq < config.liquidComplainBelow)
                    Toast("Cliente reclamou do copo quase vazio…", new Color(.91f, .72f, .14f));
            }

            Money += pay + tip;
            c.Receive();   // cliente comeca a consumir
            Served++;
            Order = null;
            CheckLevelComplete();
        }

        public void Clean(Table t)
        {
            if (!t.IsDirty) return;
            t.Clean();
            Reputation = Mathf.Min(Reputation + config.repGainClean, config.reputationMax);
            Toast("Mesa limpa! +reputação", new Color(.09f, .63f, .52f));
        }

        public void OnCustomerAbandon(Customer c)
        {
            Reputation -= config.repLossLeave;
            Combo = 1;
            Toast("Cliente foi embora! −reputação", new Color(.91f, .27f, .23f));
            if (Order != null && Order.Customer == c) { tray.UnloadAll(); Order = null; }
        }

        public void RegisterSpill(float amount)
        {
            Reputation -= config.repLossSpill * Time.deltaTime;
        }

        public void RegisterDrop(int count)
        {
            Combo = 1;
            Reputation -= 4f * count;
            // reabre itens caidos para nova retirada
            Order?.ReopenDropped(tray);
            Toast("💥 Item caiu da bandeja!", new Color(.91f, .27f, .23f));
        }

        void Update()
        {
            if (!Running) return;
            if (Reputation <= 0)
            {
                Reputation = 0; Running = false;
                hud?.ShowGameOver(LevelNum, Money, Served);
            }
        }

        void CheckLevelComplete()
        {
            if (Served < Level.target) return;
            Running = false;
            if (LevelNum >= LevelManager.Count) hud?.ShowWin();
            else hud?.ShowLevelUp(LevelNum + 1);
        }
    }
}
