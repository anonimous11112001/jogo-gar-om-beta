using UnityEngine;

namespace WaiterRush
{
    // Um item fisico sobre a bandeja (copo, taca, garrafa, xicara ou prato).
    // Mantem posicao/velocidade locais na superficie e, se tiver liquido, o nivel.
    public class TrayItem : MonoBehaviour
    {
        public ItemType Type { get; private set; }
        public bool HasLiquid { get; private set; }
        public float Liquid { get; set; } = 100f;     // %
        public Vector2 Offset;                          // posicao na superficie (x,z)
        public Vector2 Velocity;

        public Transform liquidVisual;                  // mesh do liquido (escala em Y)
        float baseLiquidHeight = 1f;

        public void Init(ItemType type)
        {
            Type = type;
            HasLiquid = ItemDB.HasLiquid(type);
            Liquid = HasLiquid ? 100f : -1f;
            if (liquidVisual != null) baseLiquidHeight = liquidVisual.localScale.y;
        }

        public void ApplyTransform(float tiltX, float tiltZ)
        {
            transform.localPosition = new Vector3(Offset.x, 0.02f, Offset.y);
            transform.localRotation = Quaternion.Euler(-tiltX * 34f, 0, tiltZ * 34f);
        }

        public void UpdateLiquidVisual()
        {
            if (liquidVisual == null) return;
            float f = Mathf.Clamp(Liquid / 100f, 0.02f, 1f);
            var s = liquidVisual.localScale;
            liquidVisual.localScale = new Vector3(s.x, baseLiquidHeight * f, s.z);
        }

        // anima a queda e destroi
        public void Fall()
        {
            transform.SetParent(null, true);
            var rb = gameObject.AddComponent<Rigidbody>();
            rb.mass = ItemDB.Mass(Type);
            rb.AddForce(new Vector3(Velocity.x, 0, Velocity.y) * 3f + Vector3.down, ForceMode.Impulse);
            Destroy(gameObject, 3f);
        }
    }
}
