import { Color3, Mesh, MeshBuilder, Ray } from "@babylonjs/core";
import { Game } from "../Game";
import { Player } from "./Player";
import { MakeStandardMaterial } from "../MaterialUtils";
import { BlockType } from "../voxel-engine/BlockType";
import { TerrainMaterial } from "../TerrainMaterial";
import { PlayerActionManager } from "./PlayerActionManager";
import { VehiclePart } from "../vehicles/Vehicle";

export abstract class PlayerAction {

    public svgIcon: string = "";

    public get game(): Game {
        return this.player.game;
    }

    public get playerActionManager(): PlayerActionManager {
        return this.player.playerActionManager;
    }

    public get equiped(): boolean {
        return this.player.action === this;
    }

    public constructor(public player: Player) {
        this.svgIcon = `<path fill-rule="evenodd" d="M4.475 5.458c-.284 0-.514-.237-.47-.517C4.28 3.24 5.576 2 7.825 2c2.25 0 3.767 1.36 3.767 3.215 0 1.344-.665 2.288-1.79 2.973-1.1.659-1.414 1.118-1.414 2.01v.03a.5.5 0 0 1-.5.5h-.77a.5.5 0 0 1-.5-.495l-.003-.2c-.043-1.221.477-2.001 1.645-2.712 1.03-.632 1.397-1.135 1.397-2.028 0-.979-.758-1.698-1.926-1.698-1.009 0-1.71.529-1.938 1.402-.066.254-.278.461-.54.461h-.777ZM7.496 14c.622 0 1.095-.474 1.095-1.09 0-.618-.473-1.092-1.095-1.092-.606 0-1.087.474-1.087 1.091S6.89 14 7.496 14"/>`;
    }

    public equip(): void {
        if (this.player.action) {
            this.player.action.unEquip();
        }
        this.player.action = this;
        this.playerActionManager.highlightPlayerAction(this);
    }

    public unEquip(): void {
        if (this.player.action === this) {
            this.player.action = undefined;
            this.playerActionManager.unlightPlayerAction(this);
        }
    }

    public update(): void {

    }

    public pointerMove(event: PointerEvent): boolean {
        return false;
    }

    public pointerDown(event: PointerEvent): boolean {
        return false;
    }

    public pointerUp(event: PointerEvent): boolean {
        return false;
    }
}

export class PlayerActionDefault extends PlayerAction {

     constructor(player: Player) {
        super(player);
    }

    public equip(): void {

    }
    
    public update(): void {
        if (this.game.terrain) {
            if (this.game.terrain) {
                let material = this.game.terrain.getMaterial(0) as TerrainMaterial;
                material.setGridRangeRadius(0);
            }
            this.player.aimedIJK = undefined;
            this.player.aimedObject = undefined;

            let aimRay = new Ray(this.player.head.absolutePosition, this.player.head.forward, 8);
            let aimPickInfo = this.game.scene.pickWithRay(aimRay, (mesh) => {
                return mesh instanceof VehiclePart;
            });
            if (aimPickInfo && aimPickInfo.pickedMesh instanceof VehiclePart) {
                this.player.aimedObject = aimPickInfo.pickedMesh.vehicle;
            }
        }
    }

    public pointerDown(event: PointerEvent): boolean {
        if (this.game.terrain) {
            if (this.player.aimedObject) {
                return true;
            }
        }
        return false;
    }
}