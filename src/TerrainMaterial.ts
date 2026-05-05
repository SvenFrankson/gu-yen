import { Vector3, Scene, Color3, Constants, Engine, RawTexture3D, Texture } from "@babylonjs/core";
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
                    "level",
                    "noiseTexture",
                    "terrainColors",
                    "lightTexture",
                    "debugColor",
                    "blockSize_m",
                    "blockHeight_m"
                ]
            }
            );

        let w = 2;
        let h = 2;
        let d = 2;
        let data: Uint8ClampedArray = new Uint8ClampedArray(w * h * d);
        data.fill(255);
        let myTestRaw3DTexture = new RawTexture3D(data, w, h, d, Constants.TEXTUREFORMAT_R, this.getScene(), false, false, Texture.TRILINEAR_SAMPLINGMODE, Engine.TEXTURETYPE_UNSIGNED_BYTE);
        myTestRaw3DTexture.wrapU = 1;
        myTestRaw3DTexture.wrapV = 1;
        myTestRaw3DTexture.wrapR = 1;
        this.setTexture("lightTexture", myTestRaw3DTexture);

        this.setLightInvDir(Vector3.One().normalize());
        
        this.setFloat("blockSize_m", 0.5);
        this.setFloat("blockHeight_m", 0.5);
        
        console.log("Passing " + BlockTypeColors.length + " terrain colors to shader");
        this.setColor3Array("terrainColors", BlockTypeColors);
        
        this.setTexture("barkTexture", new Texture("textures/bark.png"));
        this.setTexture("leavesTexture", new Texture("textures/leaves_2.png"));
        this.setTexture("dirtTexture", new Texture("textures/dirt.png"));
        this.setTexture("grassTexture", new Texture("textures/grass.png"));
        this.setTexture("grassSparseTexture", new Texture("textures/grassSparse.png"));
        this.setTexture("rockTexture", new Texture("textures/concrete.png"));
        this.setTexture("iceTexture", new Texture("textures/ice.png"));
        this.setTexture("asphaltTexture", new Texture("textures/asphalt.png"));
        this.setTexture("rustTexture", new Texture("textures/rust.png"));

        this.updateDebugColor();
    }

    public getLightInvDir(): Vector3 {
        return this._lightInvDirW;
    }

    public setLightInvDir(p: Vector3): void {
        this._lightInvDirW.copyFrom(p);
        this.setVector3("lightInvDirW", this._lightInvDirW);
    }

    private _debugColor: Color3 = Color3.White();
    public get debugColor(): Color3 {
        return this._debugColor;
    }
    public setDebugColor(c: Color3) {
        this._debugColor = c;
        this.updateDebugColor();
    }
    public updateDebugColor(): void {
        this.setColor3("debugColor", this._debugColor);
    }

    public getLevel(): number {
        return this._level;
    }

    public setLevel(v: number): void {
        this._level = v;
        this.setInt("level", this._level);
    }
}