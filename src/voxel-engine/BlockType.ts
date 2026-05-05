import { Color3 } from "@babylonjs/core/Maths/math.color";
// Notice : Adding a BlockType
// 1) BlockType in the enum
// 2) BlockTypeNames in the list
// 3) Incrementing array size in terrainToon fragment shader
// 4) Initializing with a color in PlanetMaterial.ts

export var BlockTypeNames: string[] = ["None", "Water", "Grass", "SparseGrass", "Dirt", "Sand", "Rock", "Wood", "Leaf", "Laterite", "Basalt", "Snow", "Ice", "Regolith", "Asphalt", "Rust", "Unknown"];

export enum BlockType {
    None = 0,
    Water = 1,
    Grass,
    SparseGrass,
    Dirt,
    Sand,
    Rock,
    Wood,
    Leaf,
    Laterite,
    Basalt,
    Snow,
    Ice,
    Regolith,
    Asphalt,
    Rust,
    Unknown,
}

export var BlockTypeColors: Color3[] = [];
BlockTypeColors[BlockType.None] = new Color3(1, 0, 0);
BlockTypeColors[BlockType.Water] = new Color3(0.0, 0.5, 1.0);
BlockTypeColors[BlockType.Grass] = Color3.FromHexString("#67a43c");
BlockTypeColors[BlockType.SparseGrass] = Color3.FromHexString("#67a43c");
BlockTypeColors[BlockType.Dirt] = Color3.FromHexString("#BC844C");
BlockTypeColors[BlockType.Sand] = new Color3(0.761, 0.627, 0.141);
BlockTypeColors[BlockType.Rock] = Color3.FromHexString("#7e9dab");
BlockTypeColors[BlockType.Wood] = new Color3(0.6, 0.302, 0.02);
BlockTypeColors[BlockType.Leaf] = Color3.FromHexString("#66631C");
BlockTypeColors[BlockType.Laterite] = new Color3(0.839, 0.431, 0.02);
BlockTypeColors[BlockType.Basalt] = Color3.FromHexString("#1f1916");
BlockTypeColors[BlockType.Snow] = Color3.FromHexString("#efffff");
BlockTypeColors[BlockType.Ice] = Color3.FromHexString("#95e4f0");
BlockTypeColors[BlockType.Regolith] = new Color3(0.522, 0.522, 0.522);
BlockTypeColors[BlockType.Asphalt] = Color3.FromHexString("#1f1916");
BlockTypeColors[BlockType.Rust] = new Color3(0.839, 0.431, 0.02);
