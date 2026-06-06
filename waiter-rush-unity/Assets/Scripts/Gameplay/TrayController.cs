using System.Collections.Generic;
using UnityEngine;

namespace WaiterRush
{
    // Bandeja equilibrada pelos SENSORES REAIS do celular (giroscopio +
    // acelerometro — sem bussola). A inclinacao fisica do aparelho inclina a
    // bandeja em 360 graus; os itens deslizam e podem cair.
    public class TrayController : MonoBehaviour
    {
        public GameObject copoPrefab, tacaPrefab, garrafaPrefab, xicaraPrefab, pratoPrefab;
        public Transform surface;          // plano da bandeja onde os itens ficam

        GameConfig cfg => GameManager.Instance.config;
        readonly List<TrayItem> items = new();
        public IReadOnlyList<TrayItem> Items => items;
        public List<ItemType> LastDropped { get; } = new();

        // inclinacao calibrada do device
        float tiltX, tiltZ;            // rad (frente/tras, esq/dir)
        Vector3 calib = new(0, -1, 0); // referencia neutra do acelerometro
        bool calibrated;

        public int ItemCount => items.Count;

        void Start()
        {
            if (SystemInfo.supportsGyroscope) Input.gyro.enabled = true;
        }

        public void Recalibrate()
        {
            calib = Input.acceleration.normalized;
            calibrated = true;
        }

        GameObject PrefabFor(ItemType t) => t switch
        {
            ItemType.Copo => copoPrefab,
            ItemType.Taca => tacaPrefab,
            ItemType.Garrafa => garrafaPrefab,
            ItemType.Xicara => xicaraPrefab,
            _ => pratoPrefab,
        };

        public TrayItem Load(ItemType type)
        {
            var go = Instantiate(PrefabFor(type), surface);
            var item = go.GetComponent<TrayItem>() ?? go.AddComponent<TrayItem>();
            item.Init(type);
            // distribui em circulo para nao sobrepor
            int n = items.Count;
            float ang = n * 1.7f;
            float r = n == 0 ? 0 : Mathf.Min(0.18f, 0.08f + n * 0.03f);
            item.Offset = new Vector2(Mathf.Cos(ang) * r, Mathf.Sin(ang) * r);
            items.Add(item);
            return item;
        }

        public List<DeliveredItem> UnloadAll()
        {
            var result = new List<DeliveredItem>();
            foreach (var it in items)
            {
                result.Add(new DeliveredItem { type = it.Type, hasLiquid = it.HasLiquid, liquid = it.Liquid });
                Destroy(it.gameObject);
            }
            items.Clear();
            return result;
        }

        void ReadSensors()
        {
            // acelerometro da a direcao da gravidade -> inclinacao fisica do device
            Vector3 a = Input.acceleration;
            if (!calibrated) { Recalibrate(); }
            // diferenca em relacao a postura neutra
            float gx = a.x - calib.x;   // esquerda/direita
            float gy = a.y - calib.y;   // frente/tras (telefone deitado)
            // giroscopio refina a resposta quando disponivel
            if (Input.gyro.enabled)
            {
                gx += Input.gyro.rotationRateUnbiased.y * 0.05f;
                gy += Input.gyro.rotationRateUnbiased.x * 0.05f;
            }
            tiltX = Mathf.Clamp(gy * cfg.trayResponse, -1.2f, 1.2f);
            tiltZ = Mathf.Clamp(gx * cfg.trayResponse, -1.2f, 1.2f);
        }

        void Update()
        {
            if (!GameManager.Instance.Running) return;
            ReadSensors();
            float dt = Time.deltaTime;
            LastDropped.Clear();

            // inclina a bandeja visualmente
            if (surface != null)
                surface.localRotation = Quaternion.Slerp(surface.localRotation,
                    Quaternion.Euler(tiltX * Mathf.Rad2Deg, 0, -tiltZ * Mathf.Rad2Deg), 0.2f);

            float tiltMag = Mathf.Sqrt(tiltX * tiltX + tiltZ * tiltZ);
            float spilled = 0f;

            for (int i = items.Count - 1; i >= 0; i--)
            {
                var it = items[i];
                // gravidade na superficie inclinada (centro de gravidade)
                float ax = Mathf.Sin(tiltZ) * cfg.traySlideAccel;
                float az = -Mathf.Sin(tiltX) * cfg.traySlideAccel;
                float fr = cfg.trayFriction * ItemDB.Mass(it.Type);

                it.Velocity += new Vector2(ax, az) * dt;
                float sp = it.Velocity.magnitude;
                if (sp > 0)
                {
                    float drop = Mathf.Min(sp, fr * dt);
                    it.Velocity -= it.Velocity.normalized * drop;
                }
                it.Offset += it.Velocity * dt;

                // caiu?
                if (it.Offset.magnitude > cfg.trayRadius)
                {
                    LastDropped.Add(it.Type);
                    items.RemoveAt(i);
                    it.Fall();
                    continue;
                }

                it.ApplyTransform(tiltX, tiltZ);

                // liquido balanca e derrama
                if (it.HasLiquid && it.Liquid > 0 && tiltMag > cfg.spillTiltThreshold)
                {
                    float over = tiltMag - cfg.spillTiltThreshold;
                    float s = over * cfg.spillRatePerTilt * dt;
                    it.Liquid = Mathf.Max(0, it.Liquid - s);
                    spilled += s;
                    it.UpdateLiquidVisual();
                }
            }

            if (spilled > 0.5f) GameManager.Instance.RegisterSpill(spilled);
            if (LastDropped.Count > 0) GameManager.Instance.RegisterDrop(LastDropped.Count);
        }

        public float AvgLiquid()
        {
            float sum = 0; int n = 0;
            foreach (var it in items) if (it.HasLiquid) { sum += it.Liquid; n++; }
            return n == 0 ? -1f : sum / n;
        }

        public float Imbalance => Mathf.Clamp01(Mathf.Sqrt(tiltX * tiltX + tiltZ * tiltZ) / cfg.trayTiltMax);
        public float BalanceX => Mathf.Clamp(tiltZ / cfg.trayTiltMax, -1f, 1f);
    }

    public struct DeliveredItem
    {
        public ItemType type;
        public bool hasLiquid;
        public float liquid;
    }
}
