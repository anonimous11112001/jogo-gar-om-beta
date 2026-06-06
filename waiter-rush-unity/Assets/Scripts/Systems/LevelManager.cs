using System;
using System.Collections.Generic;
using UnityEngine;

namespace WaiterRush
{
    [Serializable]
    public struct LevelData
    {
        public int number;
        public int tables;
        public int maxCustomers;
        public int itemsPerOrder;
        public bool plates;
        public bool obstacles;
        public float patienceMul;
        public float spawnMul;
        public int target;        // pedidos para concluir o nivel
    }

    // Os 20 niveis de progressao rapida (mesmos valores da versao web).
    public static class LevelManager
    {
        public static readonly List<LevelData> Levels = new()
        {
            new(){number=1, tables=2, maxCustomers=2, itemsPerOrder=1, plates=false,obstacles=false,patienceMul=1.3f, spawnMul=1.4f, target=5},
            new(){number=2, tables=3, maxCustomers=3, itemsPerOrder=1, plates=false,obstacles=false,patienceMul=1.2f, spawnMul=1.3f, target=6},
            new(){number=3, tables=4, maxCustomers=3, itemsPerOrder=1, plates=false,obstacles=false,patienceMul=1.15f,spawnMul=1.2f, target=7},
            new(){number=4, tables=4, maxCustomers=4, itemsPerOrder=1, plates=false,obstacles=true, patienceMul=1.1f, spawnMul=1.15f,target=8},
            new(){number=5, tables=5, maxCustomers=4, itemsPerOrder=2, plates=true, obstacles=true, patienceMul=1.1f, spawnMul=1.1f, target=9},
            new(){number=6, tables=5, maxCustomers=4, itemsPerOrder=2, plates=true, obstacles=true, patienceMul=1.05f,spawnMul=1.05f,target=10},
            new(){number=7, tables=6, maxCustomers=5, itemsPerOrder=2, plates=true, obstacles=true, patienceMul=1.0f, spawnMul=1.0f, target=11},
            new(){number=8, tables=6, maxCustomers=5, itemsPerOrder=2, plates=true, obstacles=true, patienceMul=1.0f, spawnMul=0.98f,target=12},
            new(){number=9, tables=7, maxCustomers=6, itemsPerOrder=2, plates=true, obstacles=true, patienceMul=0.95f,spawnMul=0.95f,target=13},
            new(){number=10,tables=8, maxCustomers=6, itemsPerOrder=3, plates=true, obstacles=true, patienceMul=0.92f,spawnMul=0.9f, target=14},
            new(){number=11,tables=8, maxCustomers=7, itemsPerOrder=3, plates=true, obstacles=true, patienceMul=0.9f, spawnMul=0.88f,target=15},
            new(){number=12,tables=9, maxCustomers=7, itemsPerOrder=3, plates=true, obstacles=true, patienceMul=0.88f,spawnMul=0.85f,target=16},
            new(){number=13,tables=9, maxCustomers=8, itemsPerOrder=3, plates=true, obstacles=true, patienceMul=0.85f,spawnMul=0.82f,target=17},
            new(){number=14,tables=10,maxCustomers=8, itemsPerOrder=3, plates=true, obstacles=true, patienceMul=0.83f,spawnMul=0.8f, target=18},
            new(){number=15,tables=10,maxCustomers=9, itemsPerOrder=4, plates=true, obstacles=true, patienceMul=0.8f, spawnMul=0.78f,target=19},
            new(){number=16,tables=11,maxCustomers=9, itemsPerOrder=4, plates=true, obstacles=true, patienceMul=0.78f,spawnMul=0.75f,target=20},
            new(){number=17,tables=11,maxCustomers=10,itemsPerOrder=4, plates=true, obstacles=true, patienceMul=0.75f,spawnMul=0.72f,target=22},
            new(){number=18,tables=12,maxCustomers=10,itemsPerOrder=4, plates=true, obstacles=true, patienceMul=0.72f,spawnMul=0.7f, target=24},
            new(){number=19,tables=12,maxCustomers=11,itemsPerOrder=5, plates=true, obstacles=true, patienceMul=0.7f, spawnMul=0.66f,target=26},
            new(){number=20,tables=12,maxCustomers=12,itemsPerOrder=5, plates=true, obstacles=true, patienceMul=0.65f,spawnMul=0.6f, target=30},
        };

        public static LevelData Get(int n) => Levels[Mathf.Clamp(n - 1, 0, Levels.Count - 1)];
        public static int Count => Levels.Count;
    }
}
