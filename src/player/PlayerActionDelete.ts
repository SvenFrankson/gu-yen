import { Color3, Mesh, MeshBuilder, Ray } from "@babylonjs/core";
import { Game } from "../Game";
import { Player } from "./Player";
import { MakeStandardMaterial } from "../MaterialUtils";
import { BlockType } from "../voxel-engine/BlockType";
import { TerrainMaterial } from "../TerrainMaterial";
import { PlayerAction } from "./PlayerAction";

export class PlayerActionDelete extends PlayerAction {

    public blockPointer: Mesh;

     constructor(player: Player) {
        super(player);

        this.svgIcon = `
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
        `;

        this.blockPointer = MeshBuilder.CreateBox("block-pointer", { size: 0.5 }, player.game.scene);
        this.blockPointer.scaling.copyFromFloats(1.05, 1.05, 1.05);
        let redMaterial = MakeStandardMaterial(new Color3(1, 0.5, 0.5), 0, 0.3);
        redMaterial.alpha = 0.5;
        this.blockPointer.material = redMaterial;
    }

    public equip(): void {
        super.equip();
    }
    
    public update(): void {
        if (this.game.terrain) {
            this.blockPointer.isVisible = false;
            if (this.game.terrain) {
                let material = this.game.terrain.getMaterial(0) as TerrainMaterial;
                material.setGridRangeRadius(0);
            }
            if (this.player.aimedObject) {
                return;
            }

            let aimRay = new Ray(this.player.head.absolutePosition, this.player.head.forward, 8);
            let pickInfos = aimRay.intersectsMeshes(this.player.chuncks.map(c => c.mesh!).filter(m => m));
            for (let pickInfo of pickInfos) {
                if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                    let p = pickInfo.pickedPoint.subtractInPlace(pickInfo.getNormal(true)!.scale(0.1));
                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                    if (ijk) {
                        this.player.aimedIJK = ijk;
                        this.blockPointer.position = ijk.chunck.getPosAtIJK(ijk.ijk);
                        this.blockPointer.isVisible = false;
                        if (this.game.terrain) {
                            let material = this.game.terrain.getMaterial(0) as TerrainMaterial;
                            material.setGridRangeRadius(this.game.terrain.blockSizeIJ_m * 0.5 + 0.02);
                            material.setGridRangePosition(this.blockPointer.position);
                        }
                        return;
                    }
                }
            }
        }
    }

    public pointerDown(event: PointerEvent): boolean {
        if (this.game.terrain) {
            if (this.player.aimedIJK) {
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
                return true;
            }
        }
        return false;
    }
}