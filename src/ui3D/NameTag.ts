import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.pure";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.pure";
import { CreatePlaneVertexData } from "@babylonjs/core/Meshes/Builders/planeBuilder.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { TranslateVertexDataInPlace } from "../VertexDataUtils";
import { Scene } from "@babylonjs/core/scene.pure";
import { QuaternionFromZYAxisToRef } from "babylonjs-tiaratumgames-tools";
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { UI_Color } from "../Game";
import { NO_OUTLINE_LAYERMASK } from "../MyCamera";

export class NameTag extends Mesh {

    public lines: string[] = ["Hello World !"];
    private _lastLineCount: number = 0;

    constructor(name: string, scene: Scene) {
        super(name, scene);
        this.layerMask = NO_OUTLINE_LAYERMASK;
        this.rotationQuaternion = Quaternion.Identity();
        this.lines = [name];
        this.redraw();
        this.getScene().onBeforeRenderObservable.add(this._update);
    }

    public setText(text: string, line: number): void {
        this.lines[line] = text;
        this.redraw();
    }

    public redraw(): void {
        let lineCount = this.lines.length;
        lineCount = Math.max(lineCount, 1);
        let w = 1;
        let h = lineCount / 8;
        let vData = CreatePlaneVertexData({ width: w, height: h });
        TranslateVertexDataInPlace(vData, new Vector3(0, h * 0.5, 0));
        vData.applyToMesh(this);
        
        let s = 512;
        let texture: DynamicTexture | null = null;

        if (!this.material) {
            let material = new StandardMaterial("name-tag-material", this.getScene());
            material.emissiveColor.copyFromFloats(1, 1, 1);
            material.specularColor.copyFromFloats(0, 0, 0);
            //material.useAlphaFromDiffuseTexture = true;
            this.material = material;

            texture = new DynamicTexture("name-tag-texture", { width: s, height: lineCount * s / 8 }, this.getScene());
            this._lastLineCount = lineCount;
            texture.hasAlpha = true;
            (this.material as StandardMaterial).diffuseTexture = texture;
            (this.material as StandardMaterial).emissiveTexture = texture;
        }        
        
        if (!texture) {
            texture = (this.material as StandardMaterial).diffuseTexture as DynamicTexture;
        }

        if (this._lastLineCount !== lineCount) {
            texture.dispose();
            texture = new DynamicTexture("name-tag-texture", { width: s, height: lineCount * s / 8 }, this.getScene());
            texture.hasAlpha = true;
            (this.material as StandardMaterial).diffuseTexture = texture;
            (this.material as StandardMaterial).emissiveTexture = texture;
            this._lastLineCount = lineCount;
        }

        let context = texture.getContext();
        context.clearRect(0, 0, s, lineCount * s / 8);
        context.font = (s / 12).toFixed(0) + "px monospace";
        context.fillStyle = UI_Color.toHexString();
        context.strokeStyle = "black";
        context.lineWidth = s / 128;

        for (let i = 0; i < lineCount; i++) {
            let text = this.lines[i];
            if (text) {
                let l = context.measureText(text);
                context.strokeText(text, s / 2 - l.width * 0.5, s / 12 + i * s / 8);
                context.fillText(text, s / 2 - l.width * 0.5, s / 12 + i * s / 8);
            }
        }
        
        texture.update();
    }

    public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        this.getScene().onBeforeRenderObservable.removeCallback(this._update);
    }

    private _update = () => {
        let activeCamera = this.getScene().activeCamera;
        if (activeCamera) {
            let dir = this.absolutePosition.subtract(activeCamera.globalPosition);
            QuaternionFromZYAxisToRef(dir, Axis.Y, this.rotationQuaternion!);
        }
    }
}