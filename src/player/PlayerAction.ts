import { Color3, Mesh, MeshBuilder, Ray } from "@babylonjs/core";
import { Game } from "../Game";
import { PelleteusePart } from "../vehicles/Pelleteuse";
import { Player } from "./Player";
import { MakeStandardMaterial } from "../MaterialUtils";
import { BlockType } from "../voxel-engine/BlockType";

export abstract class PlayerAction {

    public get game(): Game {
        return this.player.game;
    }

    public constructor(public player: Player) {
        
    }

    public update(): void {

    }

    public pointerMove(event: PointerEvent): void {

    }

    public pointerDown(event: PointerEvent): void {

    }

    public pointerUp(event: PointerEvent): void {

    }
}

export class PlayerActionDefault extends PlayerAction {

    public blockPointer: Mesh;

     constructor(player: Player) {
        super(player);
        this.blockPointer = MeshBuilder.CreateBox("block-pointer", { size: 0.5 }, player.game.scene);
        this.blockPointer.scaling.copyFromFloats(1.05, 1.05, 1.05);
        let redMaterial = MakeStandardMaterial(new Color3(1, 0.5, 0.5), 0, 0.3);
        redMaterial.alpha = 0.5;
        this.blockPointer.material = redMaterial;
    }
    
    public update(): void {
        if (this.game.terrain) {
            this.blockPointer.isVisible = false;
            this.player.aimedIJK = undefined;
            this.player.aimedObject = undefined;

            let aimRay = new Ray(this.player.head.absolutePosition, this.player.head.forward, 5);
            let aimPickInfo = this.game.scene.pickWithRay(aimRay, (mesh) => {
                return mesh instanceof PelleteusePart;
            });
            if (aimPickInfo && aimPickInfo.pickedMesh instanceof PelleteusePart) {
                this.player.aimedObject = aimPickInfo.pickedMesh.pelleteuse;
                return;
            }

            let pickInfos = aimRay.intersectsMeshes(this.player.chuncks.map(c => c.mesh!).filter(m => m));
            for (let pickInfo of pickInfos) {
                if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                    let p = pickInfo.pickedPoint.subtractInPlace(pickInfo.getNormal(true)!.scale(0.25));
                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                    if (ijk) {
                        this.player.aimedIJK = ijk;
                        this.blockPointer.position = ijk.chunck.getPosAtIJK(ijk.ijk);
                        this.blockPointer.isVisible = true;
                        return;
                    }
                }
            }
        }
    }

    public pointerDown(event: PointerEvent): void {
        if (this.game.terrain) {
            if (this.player.aimedObject) {
                
            }
            else if (this.player.aimedIJK) {
                let ijk = this.player.aimedIJK;
                let chunck = ijk.chunck;
                let affectedChuncks = chunck.setData(BlockType.None, ijk.ijk.i, ijk.ijk.j, ijk.ijk.k);
                let floatingCount = 0;
                let floatingChunks = this.game.floatingBlocksDetector?.findFloatingBlocks(chunck.iPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.i, chunck.jPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.j, ijk.ijk.k);
                if (floatingChunks) {
                    floatingCount = floatingChunks.array.length;
                    affectedChuncks.push(...floatingChunks.array);
                }
                affectedChuncks.forEach(c => c.redrawMesh(true, floatingCount > 0));
            }
        }
    }

}