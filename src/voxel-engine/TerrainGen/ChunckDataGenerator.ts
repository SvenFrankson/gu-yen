import { Terrain } from "../Terrain";
import { Chunck } from "../Chunck";
import { BlockType } from "../BlockType";
import { MapAttribute } from "../Save/GameSave";
import { ChunckDataGeneratorEmpty } from "./ChunckDataGeneratorEmpty";
import { ChunckDataGeneratorFlat } from "./ChunckDataGeneratorFlat";
import { ChunckDataGeneratorFromMaps } from "./ChunckDataGeneratorFromMaps";
import { ChunckDataGeneratorFromMapSimple } from "./ChunckDataGeneratorFromMapSimple";
import { ChunckDataGeneratorPNG } from "./ChunckDataGeneratorPNG";

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

    public static CreateGenerator(terrain: Terrain, props: IChunckGeneratorProperties): ChunckDataGenerator {
        if (props.type === GeneratorType.Flat) {
            let chunckDataGenerator = new ChunckDataGeneratorFlat(terrain);
            if (IsVeryFinite(props.blockType)) {
                chunckDataGenerator.blockType = props.blockType;
            }
            if (IsVeryFinite(props.altitude)) {
                chunckDataGenerator.altitude = props.altitude;
            }
            return chunckDataGenerator;
        }
        else if (props.type === GeneratorType.Empty) {
            let chunckDataGenerator = new ChunckDataGeneratorEmpty(terrain);
            return chunckDataGenerator;
        }
        else if (props.type === GeneratorType.Map) {
            let chunckDataGenerator = new ChunckDataGeneratorFromMaps(terrain);
            chunckDataGenerator.useTunnels = props.mapAttributes && props.mapAttributes.indexOf(MapAttribute.Tunnels) != -1;
            chunckDataGenerator.useRock = props.mapAttributes && props.mapAttributes.indexOf(MapAttribute.Rocks) != -1;
            return chunckDataGenerator;
        }
        else if (props.type === GeneratorType.MapSimple) {
            let chunckDataGenerator = new ChunckDataGeneratorFromMapSimple(terrain);
            return chunckDataGenerator;
        }
        else if (props.type === GeneratorType.PNG) {
            let chunckDataGenerator = new ChunckDataGeneratorPNG(terrain);
            chunckDataGenerator.url = props.url;
            chunckDataGenerator.squareSize = props.squareSize;
            return chunckDataGenerator;
        }
    }

    constructor(public terrain: Terrain) {

    }

    public abstract initializeData(chunck: Chunck): Promise<boolean>;
    public abstract getProps(): IChunckGeneratorProperties;
}
