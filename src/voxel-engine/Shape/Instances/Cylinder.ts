import { Shape } from "../Shape";
import { Terrain } from "../../Terrain";
import { Chunck } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
import { IJK, IsVeryFinite } from "../../../Number";
import { UniqueList } from "../../../UniqueList";

export interface ICylinderProps {
    length?: number;
    r?: number;
}

export class Cylinder extends Shape {

    
    public length: number = 2;
    public r: number = 1;

    constructor(terrain: Terrain, props?: ICylinderProps) {
        super(terrain);

        if (props) {
            if (IsVeryFinite(props.length)) {
                this.length = props.length as number;
            }
            if (IsVeryFinite(props.r)) {
                this.r = props.r as number;
            }
        }
    }

    public draw(chunck: Chunck, ijk: IJK, dir: number, blockType: BlockType, mode: TerrainEditionMode) {
        let affectedChuncks = new UniqueList<Chunck>();

        let k0 = ijk.k;
        let k1 = ijk.k + this.length;

        for (let k = k0; k <= k1; k++) {
            for (let i = - this.r; i <= this.r; i++) {
                for (let j = - this.r; j <= this.r; j++) {
                    let d = Math.sqrt(i * i + j * j);
                    if (d < this.r + 0.5) {
                        let I = ijk.i + i;
                        let J = ijk.j + j;
                        let doSet = true;
                        if (mode === TerrainEditionMode.AddIfEmpty) {
                            let b = chunck.getData(I, J, k);
                            doSet = b === BlockType.None;
                        }
                        else if (mode === TerrainEditionMode.Erase) {
                            let b = chunck.getData(I, J, k);
                            doSet = b === blockType;
                        }

                        if (doSet) {
                            if (mode === TerrainEditionMode.Erase) {
                                let chuncks = chunck.setData(BlockType.None, I, J, k, true);
                                chuncks.forEach(c => { affectedChuncks.push(c); });
                            }
                            else {
                                let chuncks = chunck.setData(blockType, I, J, k, true);
                                chuncks.forEach(c => { affectedChuncks.push(c); });
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i < affectedChuncks.length; i++) {
            let chunck = affectedChuncks.get(i);
            for (let k = k0; k <= k1; k++) {
                chunck.updateIsEmptyIsFull(k);
            }
            chunck.redrawMesh(true);
            this.terrain.save.saveChunck(chunck);
        }

        return affectedChuncks;
    }
}
