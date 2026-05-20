import { Color3, Mesh, MeshBuilder, Ray } from "@babylonjs/core";
import { Game } from "../Game";
import { Player } from "./Player";
import { MakeStandardMaterial } from "../MaterialUtils";
import { BlockType } from "../voxel-engine/BlockType";
import { TerrainMaterial } from "../TerrainMaterial";
import { PlayerAction } from "./PlayerAction";

export class PlayerActionBlock extends PlayerAction {

    public blockPointer: Mesh;

     constructor(player: Player, public blockType: BlockType) {
        super(player);

        this.svgIcon = `
            <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
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
            let pickInfos = aimRay.intersectsMeshes(this.player.chuncks.flatMap(c => c.meshes!).filter(m => m));
            for (let pickInfo of pickInfos) {
                if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                    let p = pickInfo.pickedPoint.addInPlace(pickInfo.getNormal(true)!.scale(0.25));
                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                    if (ijk) {
                        this.player.aimedIJK = ijk;
                        this.blockPointer.position = ijk.chunck.getPosAtIJK(ijk.ijk);
                        this.blockPointer.isVisible = true;
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
                let affectedChuncks = chunck.setData(this.blockType, ijk.ijk.i, ijk.ijk.j, ijk.ijk.k);
                affectedChuncks.forEach(
                    async c => await c.redrawMesh(true)
                );
                return true;
            }
        }
        return false;
    }
}