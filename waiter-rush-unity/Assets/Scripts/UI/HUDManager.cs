using UnityEngine;
using UnityEngine.UI;

namespace WaiterRush
{
    // Atualiza o HUD: dinheiro, reputacao, pedidos, fila, combo, nivel,
    // liquido carregado e indicador de equilibrio da bandeja. Tambem
    // controla o botao de acao e os paineis de fim de nivel / game over.
    public class HUDManager : MonoBehaviour
    {
        [Header("Topo")]
        public Text moneyText;
        public Text levelText;
        public Text goalText;
        public Text ordersText;
        public Text waitingText;
        public Text comboText;

        [Header("Barras")]
        public Image reputationFill;
        public Text reputationText;
        public Image liquidFill;
        public GameObject liquidGroup;

        [Header("Equilibrio")]
        public RectTransform balanceNeedle;
        public float balanceWidth = 200f;

        [Header("Acao")]
        public Button actionButton;
        public Text actionLabel;
        public Image actionBg;

        [Header("Toast")]
        public Text toastText;
        public CanvasGroup toastGroup;

        [Header("Paineis")]
        public GameObject panelStart, panelLevelUp, panelGameOver, panelWin;
        public Text levelUpText, gameOverText;

        float toastTimer;

        void OnEnable()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnToast += ShowToast;
        }
        void OnDisable()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnToast -= ShowToast;
        }

        public void SetAction(string label, bool visible, Color color)
        {
            if (actionButton == null) return;
            actionButton.gameObject.SetActive(visible);
            if (visible) { actionLabel.text = label; if (actionBg) actionBg.color = color; }
        }

        public void ShowToast(string msg, Color color)
        {
            if (toastText == null) return;
            toastText.text = msg;
            toastText.color = color;
            if (toastGroup) toastGroup.alpha = 1f;
            toastTimer = 1.6f;
        }

        void Update()
        {
            var gm = GameManager.Instance;
            if (gm == null) return;

            if (moneyText) moneyText.text = "💰 " + Mathf.FloorToInt(gm.Money);
            if (levelText) levelText.text = "NÍVEL " + gm.LevelNum;
            if (ordersText) ordersText.text = "📋 " + (gm.Order != null ? 1 : 0);
            if (comboText) comboText.text = gm.Combo > 1 ? "COMBO x" + gm.Combo : "";

            if (gm.Running)
            {
                if (goalText) goalText.text = gm.Served + "/" + gm.Level.target;
                if (reputationFill)
                {
                    reputationFill.fillAmount = gm.Reputation / 100f;
                    reputationFill.color = gm.Reputation > 50 ? new Color(.23f, .82f, .35f)
                        : gm.Reputation > 25 ? new Color(.91f, .72f, .14f) : new Color(.91f, .27f, .23f);
                }
                if (reputationText) reputationText.text = Mathf.FloorToInt(gm.Reputation) + "%";
                if (waitingText) waitingText.text = "🚪 " + gm.customers.WaitingQueue;

                float avgLiq = gm.tray.AvgLiquid();
                if (liquidGroup) liquidGroup.SetActive(avgLiq >= 0);
                if (avgLiq >= 0 && liquidFill) liquidFill.fillAmount = avgLiq / 100f;

                if (balanceNeedle)
                    balanceNeedle.anchoredPosition = new Vector2(gm.tray.BalanceX * balanceWidth * 0.5f,
                        balanceNeedle.anchoredPosition.y);
            }

            if (toastTimer > 0)
            {
                toastTimer -= Time.deltaTime;
                if (toastTimer <= 0 && toastGroup) toastGroup.alpha = 0f;
            }
        }

        // ---- paineis ----
        public void ShowLevelUp(int next)
        {
            if (levelUpText) levelUpText.text = "Próximo: Nível " + next;
            if (panelLevelUp) panelLevelUp.SetActive(true);
        }
        public void ShowGameOver(int lvl, float money, int served)
        {
            if (gameOverText) gameOverText.text = $"Nível {lvl} · ${Mathf.FloorToInt(money)} · {served} pedidos";
            if (panelGameOver) panelGameOver.SetActive(true);
        }
        public void ShowWin() { if (panelWin) panelWin.SetActive(true); }
    }
}
