import { Color3, Mesh, MeshBuilder, Ray, StandardMaterial } from "@babylonjs/core";
import { Game } from "../Game";
import { Player } from "./Player";
import { MakeStandardMaterial } from "../MaterialUtils";
import { BlockType } from "../voxel-engine/BlockType";
import { TerrainMaterial } from "../TerrainMaterial";
import { PlayerAction } from "./PlayerAction";
import { TreeGenerator } from "../devtools/TreeGenerator";
import { SphereChunckIntersection } from "../voxel-engine/TmpMath";

export class PlayerActionBall extends PlayerAction {

    public radius: number = 0.5;
    public ball: Mesh | undefined;
    public greenMat: StandardMaterial;
    public redMat: StandardMaterial;

    constructor(player: Player) {
        super(player);

        this.svgIcon = `
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
        `;

        let ball = MeshBuilder.CreateSphere("playerBall", { diameter: this.radius * 2 }, this.game.scene);
        ball.parent = this.player.head;
        ball.position.copyFromFloats(0, - 0.5, 5);
        ball.isVisible = false;
        this.redMat = MakeStandardMaterial(Color3.Red());
        this.redMat.alpha = 0.5;
        this.greenMat = MakeStandardMaterial(Color3.Green());
        this.greenMat.alpha = 0.5;
        ball.material = this.greenMat;

        this.ball = ball;
    }

    public equip(): void {
        super.equip();
        if (this.ball) {
            this.ball.isVisible = true;
        }
    }

    public unEquip(): void {
        super.unEquip();
        if (this.ball) {
            this.ball.isVisible = false;
        }
    }

    public update(): void {
        if (this.ball) {
            this.ball!.material = this.greenMat;
            this.player.chuncks.forEach(c => {
                let collision = SphereChunckIntersection(this.ball!.getAbsolutePosition(), this.radius, c);
                if (collision && collision.hit) {
                    this.ball!.material = this.redMat;
                }
            });
        }
    }
}