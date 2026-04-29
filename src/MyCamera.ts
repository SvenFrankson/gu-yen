
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Game } from "./Game";

export class MyCamera extends ArcRotateCamera {

    constructor(public game: Game) {
        super("my-camera", - Math.PI * 0.5, Math.PI * 0.25, 10, new Vector3(0, 64, 0), game.scene);

        this.attachControl(game.engine.getRenderingCanvas(), true);
    }
}