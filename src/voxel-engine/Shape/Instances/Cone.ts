import { Shape } from "../Shape";
import { Terrain } from "../../Terrain";
import { Chunck } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
import { IJK, IsVeryFinite } from "../../../Number";
import { UniqueList } from "../../../UniqueList";

export interface IConeProps {
    length?: number;
    rBase?: number;
    rTop?: number;
    rFunc?: (f: number) => number;
}

export class Cone extends Shape {

    public length: number = 2;
    public rBase?: number;
    public rTop?: number;
    public rFunc?: (f: number) => number;

    constructor(terrain: Terrain, props?: IConeProps) {
        super(terrain);
        
        if (props) {
            if (IsVeryFinite(props.length)) {
                this.length = props.length as number;
            }
            if (IsVeryFinite(props.rBase)) {
                this.rBase = props.rBase as number;
            }
            if (IsVeryFinite(props.rTop)) {
                this.rTop = props.rTop as number;
            }
            if (props.rFunc) {
                this.rFunc = props.rFunc;
            }
        }
    }

    public draw(chunck: Chunck, ijk: IJK, dir: number, blockType: BlockType, mode: TerrainEditionMode, saveToLocalStorage?: boolean) {
        let affectedChuncks = new UniqueList<Chunck>();

        let k0 = ijk.k;
        let k1 = ijk.k + this.length;

        for (let k = k0; k <= k1; k++) {
            let f = (k - k0) / (k1 - k0);
            let r: number = 0;
            if (this.rFunc) {
                r = Math.round(this.rFunc(f));
            }
            else if (typeof(this.rBase) === "number" && typeof(this.rTop) === "number") {
                r = Math.round(this.rBase * (1 - f) + this.rTop * f);
            }
            
            for (let i = - r; i <= r; i++) {
                for (let j = - r; j <= r; j++) {
                    let d = Math.sqrt(i * i + j * j);
                    if (d < r + 0.5) {
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
            if (saveToLocalStorage) {
                chunck.saveToLocalStorage();
            }
            this.terrain.save.saveChunck(chunck);
        }

        return affectedChuncks;
    }
}
