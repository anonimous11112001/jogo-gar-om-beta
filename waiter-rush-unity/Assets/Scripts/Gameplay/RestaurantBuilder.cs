using System.Collections.Generic;
using UnityEngine;

namespace WaiterRush
{
    // Monta o salao com mesas bem proximas e corredores estreitos.
    public class RestaurantBuilder : MonoBehaviour
    {
        public GameObject tablePrefab;
        public Transform tablesRoot;
        public Transform bar;              // ponto de retirada de bebidas
        public Transform kitchen;          // ponto de retirada de pratos

        [Header("Layout apertado")]
        public float spacingX = 3.0f;
        public float spacingZ = 3.0f;
        public float startZ = -2.5f;

        readonly List<Table> tables = new();
        public IReadOnlyList<Table> Tables => tables;
        public Vector3 BarPos => bar ? bar.position : new Vector3(-7.5f, 0, -8f);
        public Vector3 KitchenPos => kitchen ? kitchen.position : new Vector3(7.5f, 0, -8f);

        public void Build(int count)
        {
            foreach (var t in tables) if (t) Destroy(t.gameObject);
            tables.Clear();

            int cols = Mathf.Min(4, Mathf.CeilToInt(Mathf.Sqrt(count)));
            int rows = Mathf.CeilToInt((float)count / cols);
            float startX = -((cols - 1) * spacingX) / 2f;

            int made = 0;
            for (int r = 0; r < rows && made < count; r++)
                for (int c = 0; c < cols && made < count; c++, made++)
                {
                    Vector3 p = new(startX + c * spacingX, 0, startZ + r * spacingZ);
                    var go = Instantiate(tablePrefab, p, Quaternion.identity, tablesRoot);
                    tables.Add(go.GetComponent<Table>());
                }
        }
    }
}
