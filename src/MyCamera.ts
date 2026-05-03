
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Game } from "./Game";
import { Color3, FreeCamera, Mesh, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import { MakeStandardMaterial } from "./MaterialUtils";

export class MyCamera extends FreeCamera {

    public northNeedle: Mesh;
    public targetPosition?: Vector3;
    public targetSpeed: number = 1;
    public currentSpeed: number = 0;

    constructor(public game: Game) {
        super("my-camera", new Vector3(0, 64, 0), game.scene);

        this.northNeedle = MeshBuilder.CreateBox("north-needle", { width: 0.01, height: 0.01, depth: 2 }, game.scene);
        this.northNeedle.material = MakeStandardMaterial(new Color3(1, 0, 0), 0, 0.1);

        this.attachControl(game.engine.getRenderingCanvas(), true);
        this.game.scene.onBeforeRenderObservable.add(this._update);
    }

    private _update = () => {
        this.northNeedle.position.copyFrom(this.position);
        this.northNeedle.position.y -= 1;
        this.northNeedle.position.z += 1;

        if (this.targetPosition) {
            let dt = this.game.engine.getDeltaTime() / 1000;

            this.position = Vector3.Lerp(this.position, this.targetPosition, 0.001);
            let direction = this.targetPosition.subtract(this.position);
            let dist = direction.length();
            this.targetSpeed = Math.max(16, Math.min(32, dist / 10));
            this.currentSpeed = this.currentSpeed * 0.99 + this.targetSpeed * 0.01;
            direction.scaleInPlace(1 / dist);
            if (dist < this.currentSpeed * dt) {
                this.position.copyFrom(this.targetPosition);
                this.targetPosition = undefined;
                this.currentSpeed = 0;
            }
            else {
                this.position.addInPlace(direction.scale(this.currentSpeed * dt));
            }
        }
    }
}