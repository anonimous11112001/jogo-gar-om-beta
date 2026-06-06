using System.Collections.Generic;

namespace WaiterRush
{
    // Pedido que o garcom esta montando: itens necessarios e quais ja retirou.
    public class ActiveOrder
    {
        public Customer Customer;
        public List<ItemType> Needed;
        public List<bool> Picked;

        public ActiveOrder(Customer c)
        {
            Customer = c;
            Needed = new List<ItemType>(c.Order);
            Picked = new List<bool>();
            foreach (var _ in Needed) Picked.Add(false);
        }

        public bool AllPicked
        {
            get { foreach (var p in Picked) if (!p) return false; return true; }
        }

        public bool IsReady(TrayController tray) => AllPicked && tray.ItemCount >= Needed.Count;

        public bool NeedsDrink()
        {
            for (int i = 0; i < Needed.Count; i++)
                if (!Picked[i] && ItemDB.HasLiquid(Needed[i])) return true;
            return false;
        }

        public bool NeedsFood()
        {
            for (int i = 0; i < Needed.Count; i++)
                if (!Picked[i] && !ItemDB.HasLiquid(Needed[i])) return true;
            return false;
        }

        // Quando um item cai da bandeja, marca um do mesmo tipo como nao retirado.
        public void ReopenDropped(TrayController tray)
        {
            foreach (var t in tray.LastDropped)
                for (int i = 0; i < Needed.Count; i++)
                    if (Needed[i] == t && Picked[i]) { Picked[i] = false; break; }
        }
    }
}
