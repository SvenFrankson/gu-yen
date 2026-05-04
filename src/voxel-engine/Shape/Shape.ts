import { Terrain } from "../Terrain";
import { Chunck } from "../Chunck";
import { BlockType } from "../BlockType";
import { TerrainEditionMode } from "../TerrainEditor/TerrainEditor";
import { IJK } from "../../Number";
import { UniqueList } from "../../UniqueList";

export interface IDrawnBlocks {
    blockType: BlockType;
    i: number;
    j: number;
    k: number;
}

export abstract class Shape {

    constructor(public terrain: Terrain) {

    }

    public abstract draw(chunck: Chunck, ijk: IJK, dir: number | IJK, blockType: BlockType, mode: TerrainEditionMode, saveToLocalStorage?: boolean, skipChunckRedraw?: boolean, drawnBlocks?: IDrawnBlocks[]): UniqueList<Chunck>;
}
