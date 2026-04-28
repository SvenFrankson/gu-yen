
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Game } from "./Game";

export class MyCamera extends ArcRotateCamera {

    constructor(public game: Game) {
        super("my-camera", - Math.PI * 0.5, Math.PI * 0.25, 10, Vector3.Zero(), game.scene);
        this.lowerAlphaLimit = - Math.PI * 0.75;
        this.upperAlphaLimit = - Math.PI * 0.25;
        this.lowerBetaLimit = Math.PI * 0.25;
        this.upperBetaLimit = Math.PI * 0.75;
        this.attachControl(game.engine.getRenderingCanvas(), true);

        this.game.scene.onBeforeRenderObservable.add(() => {
            this.target.z = 0;
        });
    }
}