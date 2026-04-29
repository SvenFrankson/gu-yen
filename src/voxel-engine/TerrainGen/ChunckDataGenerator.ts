import { Terrain } from "../Terrain";
import { Chunck } from "../Chunck";
import { BlockType } from "../BlockType";
import { MapAttribute } from "../Save/GameSave";
import { ChunckDataGeneratorEmpty } from "./ChunckDataGeneratorEmpty";
import { ChunckDataGeneratorFlat } from "./ChunckDataGeneratorFlat";
import { ChunckDataGeneratorPNG } from "./ChunckDataGeneratorPNG";
import { IsVeryFinite } from "../../Number";

export enum GeneratorType {
    NotAGenerator,
    Flat,
    Map,
    MapSimple,
    PNG,
    Empty
}

export interface IChunckGeneratorProperties {
    type: GeneratorType;
    altitude?: number;
    blockType?: BlockType;
    mapAttributes?: MapAttribute[];
    squareSize?: number;
    url?: string;
}

export abstract class ChunckDataGenerator {

    constructor(public terrain: Terrain) {

    }

    public abstract initializeData(chunck: Chunck): Promise<boolean>;
    public abstract getProps(): IChunckGeneratorProperties;
}
