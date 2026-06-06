using UnityEngine;

namespace WaiterRush
{
    public enum ActionType { None, Serve, PickupBar, PickupKitchen, Deliver, Clean }

    // Decide qual acao contextual mostrar (Atender / Retirar / Entregar / Limpar)
    // e executa quando o botao de acao e tocado.
    public class InteractionController : MonoBehaviour
    {
        public Transform player;
        public CustomerManager customers;
        public RestaurantBuilder restaurant;
        public HUDManager hud;

        public ActionType Current { get; private set; }
        Customer currentCustomer;
        Table currentTable;

        GameManager GM => GameManager.Instance;
        float Range => GM.config.serveRange;

        void Update()
        {
            if (!GM.Running) { hud?.SetAction("", false, Color.white); return; }
            Current = Evaluate();
            switch (Current)
            {
                case ActionType.Serve: hud.SetAction("ATENDER", true, new Color(1f, .48f, 0)); break;
                case ActionType.PickupBar: hud.SetAction("RETIRAR BEBIDA", true, new Color(.16f, .5f, .72f)); break;
                case ActionType.PickupKitchen: hud.SetAction("RETIRAR PRATO", true, new Color(.83f, .33f, 0)); break;
                case ActionType.Deliver: hud.SetAction("ENTREGAR", true, new Color(.15f, .68f, .38f)); break;
                case ActionType.Clean: hud.SetAction("LIMPAR MESA", true, new Color(.09f, .63f, .52f)); break;
                default: hud.SetAction("", false, Color.white); break;
            }
        }

        ActionType Evaluate()
        {
            Vector3 p = player.position;
            var order = GM.Order;

            // 1) Entregar
            if (order != null && order.IsReady(GM.tray) && order.Customer.State == CustomerState.Ordered
                && Vector3.Distance(p, order.Customer.transform.position) < Range)
            { currentCustomer = order.Customer; return ActionType.Deliver; }

            // 2) Retirar no bar / cozinha
            if (order != null && !order.IsReady(GM.tray))
            {
                if (order.NeedsDrink() && Vector3.Distance(p, restaurant.BarPos) < Range + 0.6f)
                    return ActionType.PickupBar;
                if (order.NeedsFood() && Vector3.Distance(p, restaurant.KitchenPos) < Range + 0.6f)
                    return ActionType.PickupKitchen;
            }

            // 3) Atender
            if (order == null)
            {
                var c = customers.Nearest(p, CustomerState.Waiting, Range);
                if (c != null) { currentCustomer = c; return ActionType.Serve; }
            }

            // 4) Limpar
            foreach (var t in restaurant.Tables)
                if (t.IsDirty && Vector3.Distance(p, t.SeatPosition) < Range)
                { currentTable = t; return ActionType.Clean; }

            return ActionType.None;
        }

        // ligado ao OnClick do botao de acao na UI
        public void DoAction()
        {
            switch (Current)
            {
                case ActionType.Serve: GM.TakeOrder(currentCustomer); break;
                case ActionType.PickupBar: GM.PickUp(true); break;
                case ActionType.PickupKitchen: GM.PickUp(false); break;
                case ActionType.Deliver: GM.Deliver(); break;
                case ActionType.Clean:
                    GM.Clean(currentTable);
                    // o cliente que pagou vai embora apos a limpeza
                    if (currentTable.Occupant != null && currentTable.Occupant.State == CustomerState.Paying)
                        currentTable.Occupant.GoHomeHappy();
                    break;
            }
        }
    }
}
