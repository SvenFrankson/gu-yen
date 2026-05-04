import { Vector3, Scene } from "@babylonjs/core";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { BlockTypeColors } from "./voxel-engine/BlockType";

export class TerrainMaterial extends ShaderMaterial {

    private _lightInvDirW: Vector3 = Vector3.Up();
    private _level: number = 0;

    constructor(name: string, scene: Scene) {
        super(
            name,
            scene,
            {
                vertex: "terrainToon",
                fragment: "terrainToon",
            },
            {
                attributes: ["position", "normal", "uv", "uv2", "color"],
                uniforms: [
                    "world", "worldView", "worldViewProjection", "view", "projection",
                    "lightInvDirW",
                    "level"
                ]
            }
        );        

        this.setLightInvDir(Vector3.One().normalize());
        this.setLevel(0);

        this.setFloat("blockSize_m", 1);
        
        this.setColor3Array("terrainColors", BlockTypeColors);
    }

    public getLightInvDir(): Vector3 {
        return this._lightInvDirW;
    }

    public setLightInvDir(p: Vector3): void {
        this._lightInvDirW.copyFrom(p);
        this.setVector3("lightInvDirW", this._lightInvDirW);
    }

    public getLevel(): number {
        return this._level;
    }

    public setLevel(v: number): void {
        this._level = v;
        this.setInt("level", this._level);
    }
}