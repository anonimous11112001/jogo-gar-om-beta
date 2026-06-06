using System.Collections.Generic;
using UnityEngine;

namespace WaiterRush
{
    // Gera clientes, controla a fila de espera e remove quem ja saiu.
    public class CustomerManager : MonoBehaviour
    {
        public GameObject customerPrefab;
        public RestaurantBuilder restaurant;
        public Transform entrance;

        readonly List<Customer> customers = new();
        public IReadOnlyList<Customer> Customers => customers;
        public int WaitingQueue { get; private set; }

        LevelData level;
        float spawnTimer = 2f;

        public void SetLevel(LevelData lvl)
        {
            level = lvl;
            spawnTimer = 2f;
            foreach (var c in customers) if (c) Destroy(c.gameObject);
            customers.Clear();
            WaitingQueue = 0;
        }

        List<Table> FreeTables()
        {
            var list = new List<Table>();
            foreach (var t in restaurant.Tables) if (t.IsFree) list.Add(t);
            return list;
        }

        void Spawn()
        {
            var free = FreeTables();
            if (free.Count == 0) { WaitingQueue = Mathf.Min(WaitingQueue + 1, 6); return; }
            var table = free[Random.Range(0, free.Count)];
            var go = Instantiate(customerPrefab);
            var c = go.GetComponent<Customer>();
            c.Setup(table, level, entrance ? entrance.position : Vector3.zero);
            table.Occupant = c;
            customers.Add(c);
            if (WaitingQueue > 0) WaitingQueue--;
        }

        void Update()
        {
            if (!GameManager.Instance.Running) return;
            float dt = Time.deltaTime;

            spawnTimer -= dt;
            if (spawnTimer <= 0)
            {
                int seated = 0;
                foreach (var c in customers)
                    if (c.State is CustomerState.Waiting or CustomerState.Ordered
                        or CustomerState.Eating or CustomerState.Paying) seated++;
                if (seated < level.maxCustomers) Spawn();
                spawnTimer = GameManager.Instance.config.spawnIntervalBase * level.spawnMul * Random.Range(0.8f, 1.2f);
            }

            for (int i = customers.Count - 1; i >= 0; i--)
            {
                var c = customers[i];
                if (c.Abandoned && !c.gameObject.GetComponent<AbandonFlag>())
                {
                    c.gameObject.AddComponent<AbandonFlag>();
                    GameManager.Instance.OnCustomerAbandon(c);
                    if (c.Table && c.Table.Occupant == c) c.Table.Occupant = null;
                }
                if (c.State == CustomerState.Gone)
                {
                    if (c.Table && c.Table.Occupant == c)
                    {
                        if (!c.Abandoned) c.Table.SetDirty();   // pagou: mesa fica suja
                        c.Table.Occupant = null;
                    }
                    Destroy(c.gameObject);
                    customers.RemoveAt(i);
                }
            }
        }

        // cliente mais proximo num dado estado, dentro de um raio
        public Customer Nearest(Vector3 pos, CustomerState state, float range)
        {
            Customer best = null; float bestD = range;
            foreach (var c in customers)
            {
                if (c.State != state) continue;
                float d = Vector3.Distance(pos, c.transform.position);
                if (d < bestD) { bestD = d; best = c; }
            }
            return best;
        }
    }

    // marcador interno para nao contar o abandono duas vezes
    public class AbandonFlag : MonoBehaviour { }
}
