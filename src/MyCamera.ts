
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Game } from "./Game";
import { Color3, FreeCamera, Mesh, MeshBuilder, Ray, StandardMaterial } from "@babylonjs/core";
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
        if (this.game.terrain) {
            let ray = new Ray(this.position.add(new Vector3(0, 1.8, 0)), Vector3.Down(), 1000);
            let ijk = this.game.terrain.getChunckAndIJKAtPos(this.position, 0, true);
            if (ijk) {
                let chunck = ijk.chunck;
                let chuncks = [chunck];
                if (ijk.ijk.i < chuncks[0].chunckLengthIJ * 0.5) {
                    let leftChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos - 1, chunck.jPos);
                    if (leftChunck) {
                        chuncks.push(leftChunck);
                    }
                }
                else {
                    let rightChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos + 1, chunck.jPos);
                    if (rightChunck) {
                        chuncks.push(rightChunck);
                    }
                }
                if (ijk.ijk.j < chuncks[0].chunckLengthIJ * 0.5) {
                    let topChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos, chunck.jPos - 1);
                    if (topChunck) {
                        chuncks.push(topChunck);
                    }
                }
                else {
                    let bottomChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos, chunck.jPos + 1);
                    if (bottomChunck) {
                        chuncks.push(bottomChunck);
                    }
                }
                let pickInfos = ray.intersectsMeshes(chuncks.map(c => c.mesh!).filter(m => m));
                for (let pickInfo of pickInfos) {
                    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                        this.targetPosition = pickInfo.pickedPoint.add(new Vector3(0, 1.8, 0));
                    }
                }
            }
        }
        this.northNeedle.position.copyFrom(this.position);
        this.northNeedle.position.y -= 1;
        this.northNeedle.position.z += 1;

        if (this.targetPosition) {
            Vector3.LerpToRef(this.position, this.targetPosition, 0.1, this.position);
            if (this.position.y < this.targetPosition.y - 0.5) {
                this.position.y = this.targetPosition.y - 0.5;
            }
        }
    }
}