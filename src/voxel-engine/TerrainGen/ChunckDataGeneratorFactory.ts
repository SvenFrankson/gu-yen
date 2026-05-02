import { IsVeryFinite } from "../../Number";
import { BlockType } from "../BlockType";
import { Terrain } from "../Terrain";
import { IChunckGeneratorProperties, ChunckDataGenerator, GeneratorType } from "./ChunckDataGenerator";
import { ChunckDataGeneratorEmpty } from "./ChunckDataGeneratorEmpty";
import { ChunckDataGeneratorFlat } from "./ChunckDataGeneratorFlat";
import { ChunckDataGeneratorPNG } from "./ChunckDataGeneratorPNG";

export class ChunckDataGeneratorFactory {
    
    public static CreateGenerator(terrain: Terrain, props: IChunckGeneratorProperties): ChunckDataGenerator {
        if (props.type === GeneratorType.Flat) {
            let chunckDataGenerator = new ChunckDataGeneratorFlat(terrain);
            if (IsVeryFinite(props.blockType)) {
                chunckDataGenerator.blockType = props.blockType as BlockType;
            }
            if (IsVeryFinite(props.altitude)) {
                chunckDataGenerator.altitude = props.altitude as number;
            }
            return chunckDataGenerator;
        }
        else if (props.type === GeneratorType.Empty) {
            let chunckDataGenerator = new ChunckDataGeneratorEmpty(terrain);
            return chunckDataGenerator;
        }
        /*
        else if (props.type === GeneratorType.Map) {
            let chunckDataGenerator = new ChunckDataGeneratorFromMaps(terrain);
            chunckDataGenerator.useTunnels = props.mapAttributes && props.mapAttributes.indexOf(MapAttribute.Tunnels) != -1 ?? false;
            chunckDataGenerator.useRock = props.mapAttributes && props.mapAttributes.indexOf(MapAttribute.Rocks) != -1 ?? false;
            return chunckDataGenerator;
        }
        else if (props.type === GeneratorType.MapSimple) {
            let chunckDataGenerator = new ChunckDataGeneratorFromMapSimple(terrain);
            return chunckDataGenerator;
        }
        */
        else if (props.type === GeneratorType.PNG) {
            let chunckDataGenerator = new ChunckDataGeneratorPNG(terrain);
            chunckDataGenerator.url = props.url as string;
            chunckDataGenerator.noiseUrl = props.noiseUrl as string;
            chunckDataGenerator.squareSize = props.squareSize as number;
            return chunckDataGenerator;
        }
        let chunckDataGenerator = new ChunckDataGeneratorFlat(terrain);
            chunckDataGenerator.blockType = BlockType.Dirt;
            chunckDataGenerator.altitude = 5;
        return chunckDataGenerator;
    }
}
