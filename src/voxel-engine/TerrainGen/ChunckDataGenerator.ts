import { Terrain } from "../Terrain";
import { Chunck } from "../Chunck";
import { BlockType } from "../BlockType";
import { MapAttribute } from "../Save/GameSave";
import { IDataTile, IDataTilesCollection, IRoadData, ITreeData } from "./ChunckDataGeneratorDataSets";

export enum GeneratorType {
    NotAGenerator,
    Flat,
    Map,
    MapSimple,
    PNG,
    DataSets,
    Empty
}

export interface IChunckGeneratorProperties {
    type: GeneratorType;
    altitude?: number;
    blockType?: BlockType;
    mapAttributes?: MapAttribute[];
    squareSize?: number;
    url?: string;
    noiseUrl?: string;
    treeTiles?: IDataTilesCollection<IDataTile<ITreeData>>;
    roadTiles?: IDataTilesCollection<IDataTile<IRoadData>>;
}

export abstract class ChunckDataGenerator {

    constructor(public terrain: Terrain) {

    }

    public abstract initializeData(chunck: Chunck): Promise<boolean>;
    public abstract getProps(): IChunckGeneratorProperties;
}
