import { Shape } from "../../Shape/Shape";
import { Terrain } from "../../Terrain";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
import { UniqueList } from "../../../UniqueList";
import { IJK } from "../../../Number";
import { RawProp } from "./RawProp";

export interface IVoxelDrawingDataSerialized {
    offset: { i: number, j: number, k: number };
    wI: number;
    dJ: number;
    hK: number;
    dataString: string;
}

export interface IVoxelDrawingData {
    offset: { i: number, j: number, k: number };
    wI: number;
    dJ: number;
    hK: number;
    data: Uint8Array;
}

export class VoxelDrawing extends RawProp {
    private data: IVoxelDrawingData | null = null;

    public mirrorX: boolean = false;
    public mirrorZ: boolean = false;

    constructor(serializedData: IVoxelDrawingDataSerialized) {
        super();
        this.data = {
            offset: serializedData.offset,
            wI: serializedData.wI,
            dJ: serializedData.dJ,
            hK: serializedData.hK,
            data: Uint8Array.from(atob(serializedData.dataString), c => c.charCodeAt(0))
        }
    }

    public draw(i: number, j: number, k: number, chunck: Chunck): void {
        if (this.data === null || this.data.data === undefined) {
            console.warn("VoxelDrawing: No data to draw");
            return;
        }
        let m = DRAW_CHUNCK_MARGIN;
        let affectedChuncks = new UniqueList<Chunck>();

        for (let ii = 0; ii < this.data.wI; ii++) {
            for (let jj = 0; jj < this.data.dJ; jj++) {
                for (let kk = 0; kk < this.data.hK; kk++) {
                    let iIndex = this.mirrorX ? this.data.wI - 1 - ii : ii;
                    let jIndex = this.mirrorZ ? this.data.dJ - 1 - jj : jj;
                    let kIndex = kk;
                    let block = this.data.data[iIndex + jIndex * this.data.wI + kIndex * this.data.wI * this.data.dJ];
                    if (block != null && block != 0 && block != BlockType.Unknown) {
                        chunck.setRawDataSafe(block, i + ii + this.data.offset.i + m, j + jj + this.data.offset.j + m, k + kk + this.data.offset.k);
                        affectedChuncks.push(chunck);
                    }
                }
            }
        }
    }
}
