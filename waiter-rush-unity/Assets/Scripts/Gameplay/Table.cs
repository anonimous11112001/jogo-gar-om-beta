using System.Collections.Generic;
using UnityEngine;

namespace WaiterRush
{
    // Uma mesa do salao. Pode estar ocupada e/ou suja.
    public class Table : MonoBehaviour
    {
        public Customer Occupant;
        public bool IsDirty { get; private set; }
        public Transform seat;             // ponto onde o cliente senta
        public GameObject dirtyPrefab;     // loucas/lixo deixados
        readonly List<GameObject> dirtyObjects = new();

        public Vector3 SeatPosition => seat != null ? seat.position
            : transform.position + new Vector3(0, 0, 1.1f);

        public bool IsFree => Occupant == null && !IsDirty;

        public void SetDirty()
        {
            IsDirty = true;
            if (dirtyPrefab == null) return;
            for (int i = 0; i < 3; i++)
            {
                var o = Instantiate(dirtyPrefab, transform);
                o.transform.localPosition = new Vector3((i - 1) * 0.2f, 1.04f, 0);
                dirtyObjects.Add(o);
            }
        }

        public void Clean()
        {
            IsDirty = false;
            foreach (var o in dirtyObjects) Destroy(o);
            dirtyObjects.Clear();
        }
    }
}
