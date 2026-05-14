import { Vector3, Scene, Color3, Constants, Engine, RawTexture3D, Texture } from "@babylonjs/core";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { BlockTypeColors } from "./voxel-engine/BlockType";

export class ToonMaterial extends ShaderMaterial {

    private _lightInvDirW: Vector3 = Vector3.Up();
    private _level: number = 0;

    constructor(name: string, scene: Scene) {
        super(
            name,
            scene,
            {
                vertex: "propToon",
                fragment: "propToon",
            },
            {
                attributes: ["position", "normal", "uv", "uv2", "color"],
                uniforms: [
                    "world", "worldView", "worldViewProjection", "view", "projection",
                    "lightInvDirW",
                    "debugColor",
                    "cameraPosition",
                    "rangeRadius_m",
                    "rangePosition"
                ]
            }
        );


        this.setLightInvDir(Vector3.One().normalize());
        
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

    public setRangeRadius(radius: number): void {
        this.setFloat("rangeRadius_m", radius);
    }
    public setRangePosition(pos: Vector3): void {
        this.setVector3("rangePosition", pos);
    }
}