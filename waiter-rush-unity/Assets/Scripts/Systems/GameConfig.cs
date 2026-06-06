using System;
using UnityEngine;

namespace WaiterRush
{
    // Constantes globais de balanceamento. Ajuste no Inspector via GameManager.
    [Serializable]
    public class GameConfig
    {
        [Header("Jogador")]
        public float walkSpeed = 3.2f;
        public float runSpeed = 6.0f;
        public float turnSpeed = 12f;

        [Header("Bandeja / Equilibrio")]
        public float trayResponse = 1.6f;      // sensor -> inclinacao da bandeja
        public float trayTiltMax = 0.55f;      // rad antes de cair tudo
        public float traySlideAccel = 5.5f;
        public float trayFriction = 2.4f;
        public float trayRadius = 0.42f;

        [Header("Liquido")]
        public float spillRatePerTilt = 26f;
        public float spillTiltThreshold = 0.22f;
        public float liquidComplainBelow = 50f;
        public float liquidFailBelow = 20f;

        [Header("Clientes")]
        public float patienceSeconds = 30f;
        public float eatDrinkSeconds = 18f;
        public float serveRange = 2.2f;
        public float spawnIntervalBase = 6.5f;

        [Header("Reputacao")]
        public float reputationStart = 100f;
        public float reputationMax = 100f;
        public float repGainServe = 4f;
        public float repGainDeliverPerfect = 7f;
        public float repGainClean = 3f;
        public float repLossLeave = 14f;
        public float repLossSpill = 5f;

        [Header("Economia")]
        public int basePayPerItem = 8;
        public int baseTip = 5;
    }

    public enum ItemType { Copo, Taca, Garrafa, Xicara, Prato }

    public static class ItemDB
    {
        public static bool HasLiquid(ItemType t) =>
            t == ItemType.Copo || t == ItemType.Taca || t == ItemType.Garrafa || t == ItemType.Xicara;

        public static float Mass(ItemType t) => t switch
        {
            ItemType.Garrafa => 0.7f,
            ItemType.Prato => 0.6f,
            ItemType.Copo => 0.4f,
            ItemType.Taca => 0.35f,
            _ => 0.3f,
        };
    }
}
