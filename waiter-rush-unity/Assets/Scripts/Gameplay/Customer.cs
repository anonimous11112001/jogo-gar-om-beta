using System.Collections.Generic;
using UnityEngine;

namespace WaiterRush
{
    public enum CustomerState { Entering, ToTable, Waiting, Ordered, Eating, Paying, Leaving, Gone }

    // Ciclo de vida: entra -> caminha -> senta -> espera (paciencia) -> pede
    //  -> espera entrega -> consome -> paga -> sai.
    public class Customer : MonoBehaviour
    {
        public CustomerState State { get; private set; } = CustomerState.Entering;
        public List<ItemType> Order { get; private set; } = new();
        public Table Table;
        public bool Abandoned { get; private set; }

        public Transform marker;            // sprite flutuante de estado
        public TextMesh markerText;         // emoji/icone

        LevelData level;
        float patience, patienceMax, timer;
        Vector3 target;
        const float Speed = 2.4f;

        static readonly string[] DrinkNames = { "Agua", "Refrigerante", "Suco", "Cafe", "Vinho", "Cerveja" };
        static readonly ItemType[] DrinkItems = { ItemType.Copo, ItemType.Copo, ItemType.Copo, ItemType.Xicara, ItemType.Taca, ItemType.Garrafa };
        static readonly ItemType[] FoodItems = { ItemType.Prato };

        public float PatienceFraction => patienceMax > 0 ? patience / patienceMax : 0;

        public void Setup(Table table, LevelData lvl, Vector3 entrance)
        {
            Table = table;
            level = lvl;
            transform.position = entrance;
            target = table.SeatPosition;
            patience = patienceMax = GameManager.Instance.config.patienceSeconds * lvl.patienceMul;
            BuildOrder();
            SetMark("");
        }

        void BuildOrder()
        {
            Order.Clear();
            for (int i = 0; i < level.itemsPerOrder; i++)
            {
                bool food = level.plates && Random.value < 0.4f;
                Order.Add(food ? FoodItems[Random.Range(0, FoodItems.Length)]
                                : DrinkItems[Random.Range(0, DrinkItems.Length)]);
            }
        }

        public string OrderSummary() => string.Join(", ", Order);

        public bool TakeOrder()
        {
            if (State != CustomerState.Waiting) return false;
            State = CustomerState.Ordered;
            SetMark("📝");
            return true;
        }

        public void Receive()
        {
            if (State != CustomerState.Ordered) return;
            State = CustomerState.Eating;
            timer = GameManager.Instance.config.eatDrinkSeconds * Random.Range(0.85f, 1.15f);
            SetMark("🍽️");
        }

        void Update()
        {
            float dt = Time.deltaTime;
            switch (State)
            {
                case CustomerState.Entering:
                case CustomerState.ToTable:
                    State = CustomerState.ToTable;
                    if (WalkTo(target, dt)) { State = CustomerState.Waiting; SetMark("🔔"); }
                    break;

                case CustomerState.Waiting:
                    patience -= dt;
                    UpdateMood();
                    if (patience <= 0) Abandon();
                    break;

                case CustomerState.Ordered:
                    patience -= dt * 0.6f;
                    if (patience <= 0) Abandon();
                    break;

                case CustomerState.Eating:
                    timer -= dt;
                    if (timer <= 0) { State = CustomerState.Paying; SetMark("💵"); }
                    break;

                case CustomerState.Paying:
                    // espera ser limpo; ao limpar a mesa o cliente sai (CustomerManager)
                    break;

                case CustomerState.Leaving:
                    if (WalkTo(target, dt)) State = CustomerState.Gone;
                    break;
            }
            if (marker != null) marker.forward = Camera.main ? Camera.main.transform.forward : marker.forward;
        }

        void UpdateMood()
        {
            float f = PatienceFraction;
            if (f > 0.6f) SetMark("🔔");
            else if (f > 0.3f) SetMark("😐");
            else SetMark("😠");
        }

        void Abandon()
        {
            Abandoned = true;
            SetMark("🤬");
            State = CustomerState.Leaving;
            target = new Vector3(0, transform.position.y, 9.8f);
        }

        public void GoHomeHappy()
        {
            State = CustomerState.Leaving;
            target = new Vector3(0, transform.position.y, 9.8f);
        }

        bool WalkTo(Vector3 t, float dt)
        {
            t.y = transform.position.y;
            float d = Vector3.Distance(transform.position, t);
            if (d < 0.15f) return true;
            Vector3 dir = (t - transform.position) / d;
            transform.position += dir * Speed * dt;
            transform.rotation = Quaternion.LookRotation(new Vector3(dir.x, 0, dir.z));
            return false;
        }

        void SetMark(string s) { if (markerText != null) markerText.text = s; }
    }
}
