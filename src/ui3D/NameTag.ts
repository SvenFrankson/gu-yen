import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";

export class NameTag extends Mesh {

    public text: string = "Hello World !";

    public setText(text: string): void {
        this.text = text;
        if (this.material) {
            this.material.dispose(true, true);
        }
        let material = new StandardMaterial("name-tag-material");
        material.emissiveColor.copyFromFloats(1, 1, 1);
        material.useAlphaFromDiffuseTexture = true;
        
        let s = 512;
        let texture = new DynamicTexture("name-tag-texture", { width: s, height: s / 4 },this.game.scene);
        texture.hasAlpha = true;

        let context = texture.getContext();
        context.fillStyle = "#00000000";
        context.fillRect(0, 0, s, s / 4);
        context.font = (s / 10).toFixed(0) + "px Roboto";
        context.fillStyle = "#ffffffff";
        context.strokeStyle = "#000000ff";
        context.lineWidth = s / 128;
        let l = context.measureText(this.text);
        context.strokeText(this.text, s / 2 - l.width * 0.5, s / 8);
        context.fillText(this.text, s / 2 - l.width * 0.5, s / 8);
        
        context.font = (s / 12).toFixed(0) + "px Roboto";
        let l2 = context.measureText(this.role);
        context.strokeText(this.role, s / 2 - l2.width * 0.5, s / 4 - s / 32);
        context.fillText(this.role, s / 2 - l2.width * 0.5, s / 4 - s / 32);
        
        texture.update();
        material.diffuseTexture = texture;

        this.material = material;
    }

}