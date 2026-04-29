import { Shape } from "../Shape";
import { Terrain } from "../../Terrain";
import { Chunck } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
import { IJK, IsVeryFinite } from "../../../Number";
import { UniqueList } from "../../../UniqueList";

export interface IBoxProps {
    width?: number;
    height?: number;
    length?: number;
}

export class Box extends Shape {

    public width: number = 1;
    public height: number = 1;
    public length: number = 1;

    constructor(terrain: Terrain, props: IBoxProps) {
        super(terrain);
        
        if (props) {
            if (IsVeryFinite(props.width)) {
                this.width = props.width as number;
            }
            if (IsVeryFinite(props.height)) {
                this.height = props.height as number;
            }
            if (IsVeryFinite(props.length)) {
                this.length = props.length as number;
            }
        }
    }

    public draw(chunck: Chunck, ijk: IJK, dir: number, blockType: BlockType, mode: TerrainEditionMode, saveToLocalStorage?: boolean) {
        let affectedChuncks = new UniqueList<Chunck>();

        let cosa = 1;
        let sina = 0;

        if (dir === 1) {
            cosa = 0;
            sina = - 1;
        }
        if (dir === 2) {
            cosa = - 1;
            sina = 0;
        }
        if (dir === 3) {
            cosa = 0;
            sina = 1;
        }

        for (let k = 0; k < this.height; k++) {
            for (let i = 0; i < this.width; i++) {
                for (let j = 0; j < this.length; j++) {
                    let I = ijk.i + cosa * i - sina * j;
                    let J = ijk.j + sina * i + cosa * j;
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

        for (let i = 0; i < affectedChuncks.length; i++) {
            let chunck = affectedChuncks.get(i);
            for (let k = 0; k <= this.height; k++) {
                chunck.updateIsEmptyIsFull(ijk.k + k);
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
