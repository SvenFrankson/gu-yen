import { IsVeryFinite } from "../../Number";
import { BlockType } from "../BlockType";
import { Terrain } from "../Terrain";
import { IChunckGeneratorProperties, ChunckDataGenerator, GeneratorType } from "./ChunckDataGenerator";
import { ChunckDataGeneratorDataSets, ITreeTile } from "./ChunckDataGeneratorDataSets";
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
        else if (props.type === GeneratorType.DataSets) {
            let chunckDataGenerator = new ChunckDataGeneratorDataSets(terrain);
            chunckDataGenerator.url = props.url as string;
            chunckDataGenerator.noiseUrl = props.noiseUrl as string;
            chunckDataGenerator.squareSize = props.squareSize as number;
            chunckDataGenerator.treeTiles = props.treeTiles as ITreeTile[];

            let dLat = Math.atan2(16384, terrain.geoConverter.radius) / Math.PI * 180;
            let dLong = Math.atan2(16384, terrain.geoConverter.radius * Math.cos(terrain.geoConverter.latZero * Math.PI / 180)) / Math.PI * 180;

            chunckDataGenerator.lat0 = terrain.geoConverter.latZero - dLat;
            chunckDataGenerator.long0 = terrain.geoConverter.longZero - dLong;
            chunckDataGenerator.lat1 = terrain.geoConverter.latZero + dLat;
            chunckDataGenerator.long1 = terrain.geoConverter.longZero + dLong;

            chunckDataGenerator.treeTiles.forEach(tile => {
                tile.trees.forEach(t => {
                    let x = (t.long - chunckDataGenerator.long0) / (chunckDataGenerator.long1 - chunckDataGenerator.long0);
                    let y = (t.lat - chunckDataGenerator.lat0) / (chunckDataGenerator.lat1 - chunckDataGenerator.lat0);
                    t.iGlobal = Math.floor(x * terrain.chunckLengthIJ * terrain.chunckCountIJ);
                    t.jGlobal = Math.floor(y * terrain.chunckLengthIJ * terrain.chunckCountIJ);
                });
            });

            return chunckDataGenerator;
        }
        let chunckDataGenerator = new ChunckDataGeneratorFlat(terrain);
            chunckDataGenerator.blockType = BlockType.Dirt;
            chunckDataGenerator.altitude = 5;
        return chunckDataGenerator;
    }
}
