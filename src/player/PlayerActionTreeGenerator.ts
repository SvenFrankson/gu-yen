import { Color3, Mesh, MeshBuilder, Ray } from "@babylonjs/core";
import { Game } from "../Game";
import { Player } from "./Player";
import { MakeStandardMaterial } from "../MaterialUtils";
import { BlockType } from "../voxel-engine/BlockType";
import { TerrainMaterial } from "../TerrainMaterial";
import { PlayerAction } from "./PlayerAction";
import { TreeGenerator } from "../devtools/TreeGenerator";

export class PlayerActionTreeGenerator extends PlayerAction {

    public treeGenerator: TreeGenerator;

    constructor(player: Player) {
        super(player);

        this.svgIcon = `
            <path d="M8.416.223a.5.5 0 0 0-.832 0l-3 4.5A.5.5 0 0 0 5 5.5h.098L3.076 8.735A.5.5 0 0 0 3.5 9.5h.191l-1.638 3.276a.5.5 0 0 0 .447.724H7V16h2v-2.5h4.5a.5.5 0 0 0 .447-.724L12.31 9.5h.191a.5.5 0 0 0 .424-.765L10.902 5.5H11a.5.5 0 0 0 .416-.777zM6.437 4.758A.5.5 0 0 0 6 4.5h-.066L8 1.401 10.066 4.5H10a.5.5 0 0 0-.424.765L11.598 8.5H11.5a.5.5 0 0 0-.447.724L12.69 12.5H3.309l1.638-3.276A.5.5 0 0 0 4.5 8.5h-.098l2.022-3.235a.5.5 0 0 0 .013-.507"/>
        `;

        this.treeGenerator = new TreeGenerator(this.player.game);
    }

    public equip(): void {
        super.equip();
    }
    
    public update(): void {
        if (this.game.terrain) {
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
                    let p = pickInfo.pickedPoint.subtractInPlace(pickInfo.getNormal(true)!.scale(0.1));
                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                    if (ijk) {
                        this.player.aimedIJK = ijk;
                        if (this.game.terrain) {
                            let material = this.game.terrain.getMaterial(0) as TerrainMaterial;
                            material.setGridRangeRadius(this.game.terrain.blockSizeIJ_m * 0.5 + 0.02);
                            material.setGridRangePosition(ijk.chunck.getPosAtIJK(ijk.ijk));
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
                let rootPos = this.player.aimedIJK.chunck.getPosAtIJK(this.player.aimedIJK.ijk);
                this.treeGenerator.makeTree(rootPos);
                return true;
            }
        }
        return false;
    }
}