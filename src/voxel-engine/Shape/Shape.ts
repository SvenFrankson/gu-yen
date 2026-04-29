import { Terrain } from "../Terrain";
import { Chunck } from "../Chunck";
import { BlockType } from "../BlockType";
import { TerrainEditionMode } from "../TerrainEditor/TerrainEditor";

export abstract class Shape {

    constructor(public terrain: Terrain) {

    }

    public abstract draw(chunck: Chunck, ijk: IJK, dir: number | IJK, blockType: BlockType, mode: TerrainEditionMode, saveToLocalStorage?: boolean, skipChunckRedraw?: boolean): UniqueList<Chunck>;
}
