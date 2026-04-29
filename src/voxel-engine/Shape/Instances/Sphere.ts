import { Shape } from "../Shape";
import { Terrain } from "../../Terrain";
import { Chunck } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
import { IJK, IsVeryFinite } from "../../../Number";
import { UniqueList } from "../../../UniqueList";

export interface ISphereProps {
    diameter?: number;
}

export class Sphere extends Shape {

    public diameter: number = 2;

    constructor(terrain: Terrain, props?: ISphereProps) {
        super(terrain);
        if (props) {
            if (IsVeryFinite(props.diameter)) {
                this.diameter = props.diameter as number;
            }
        }
    }

    public draw(chunck: Chunck, ijk: IJK, dir: number, blockType: BlockType, mode: TerrainEditionMode, saveToLocalStorage?: boolean) {
        let affectedChuncks = new UniqueList<Chunck>();

        let first = - Math.floor(this.diameter / 2);
        let last = Math.ceil(this.diameter / 2);

        for (let k = first; k <= last; k++) {
            for (let i = first; i <= last; i++) {
                for (let j = first; j <= last; j++) {
                    let offset = this.diameter % 2 === 0 ? 0.5 : 0;
                    let d = Math.sqrt((i + offset) * (i + offset) + (j + offset) * (j + offset) + (k + offset) * (k + offset));
                    if (d < Math.floor(this.diameter / 2) + 0.5) {
                        let I = ijk.i + i;
                        let J = ijk.j + j;
                        let K = ijk.k + k;
                        let doSet = true;
                        if (mode === TerrainEditionMode.AddIfEmpty) {
                            let b = chunck.getData(I, J, K);
                            doSet = b === BlockType.None;
                        }
                        else if (mode === TerrainEditionMode.Erase && blockType != BlockType.None) {
                            let b = chunck.getData(I, J, K);
                            doSet = b === blockType;
                        }

                        if (doSet) {
                            if (mode === TerrainEditionMode.Erase) {
                                let chuncks = chunck.setData(BlockType.None, I, J, K, true);
                                chuncks.forEach(c => { affectedChuncks.push(c); });
                            }
                            else {
                                let chuncks = chunck.setData(blockType, I, J, K, true);
                                chuncks.forEach(c => { affectedChuncks.push(c); });
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i < affectedChuncks.length; i++) {
            let chunck = affectedChuncks.get(i);
            for (let k = ijk.k + first; k <= ijk.k + last; k++) {
                chunck.updateIsEmptyIsFull(k);
            }
            chunck.redrawMesh(true);
            if (saveToLocalStorage) {
                chunck.saveToLocalStorage();
            }
            this.terrain.save.saveChunck(chunck);
        }

        return affectedChuncks;
    }
}
