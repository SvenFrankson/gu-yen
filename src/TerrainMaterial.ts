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
                    "blockHeight_m",
                    "cameraPosition",
                    "rangeRadius_m",
                    "rangePosition",
                    "gridRangeRadius_m",
                    "gridRangePosition"
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

        this.getScene().onBeforeRenderObservable.add(this._update);
    }

    public dispose(forceDisposeEffect?: boolean, forceDisposeTextures?: boolean, notBoundToMesh?: boolean): void {
        super.dispose(forceDisposeEffect, forceDisposeTextures, notBoundToMesh);
        this.getScene().onBeforeRenderObservable.removeCallback(this._update);
    }

    private _update = () => {
        let camera = this.getScene().activeCameras![0];
        if (camera) {
            this.setVector3("cameraPosition", camera.position);
        }
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

    private _rangeRadius: number = 0;
    public get rangeRadius(): number {
        return this._rangeRadius;
    }
    public setRangeRadius(radius: number): void {
        this._rangeRadius = radius;
        this.setFloat("rangeRadius_m", radius);
    }
    
    private _rangePosition: Vector3 = Vector3.Zero();
    public get rangePosition(): Vector3 {
        return this._rangePosition;
    }
    public setRangePosition(c: Vector3) {
        this._rangePosition = c;
        this.updateRangePosition();
    }
    public updateRangePosition(): void {
        this.setVector3("rangePosition", this._rangePosition);
    }

    private _gridRangeRadius: number = 0;
    public get gridRangeRadius(): number {
        return this._gridRangeRadius;
    }
    public setGridRangeRadius(radius: number): void {
        this._gridRangeRadius = radius;
        this.setFloat("gridRangeRadius_m", radius);
    }
    
    private _gridRangePosition: Vector3 = Vector3.Zero();
    public get gridRangePosition(): Vector3 {
        return this._gridRangePosition;
    }
    public setGridRangePosition(c: Vector3) {
        this._gridRangePosition = c;
        this.updateGridRangePosition();
    }
    public updateGridRangePosition(): void {
        this.setVector3("gridRangePosition", this._gridRangePosition);
    }
}