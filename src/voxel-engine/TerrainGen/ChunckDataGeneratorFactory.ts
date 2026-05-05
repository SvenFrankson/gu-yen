import { IsVeryFinite } from "../../Number";
import { UniqueList } from "../../UniqueList";
import { BlockType } from "../BlockType";
import { Terrain } from "../Terrain";
import { IChunckGeneratorProperties, ChunckDataGenerator, GeneratorType } from "./ChunckDataGenerator";
import { ChunckDataGeneratorDataSets, IDataTile, IDataTilesCollection, IRoadData, ITreeData } from "./ChunckDataGeneratorDataSets";
import { ChunckDataGeneratorEmpty } from "./ChunckDataGeneratorEmpty";
import { ChunckDataGeneratorFlat } from "./ChunckDataGeneratorFlat";
import { ChunckDataGeneratorPNG } from "./ChunckDataGeneratorPNG";
import { treesVoxelDrawingDatas } from "./RawProp/Tree";

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
            chunckDataGenerator.treeTiles = props.treeTiles as IDataTilesCollection<IDataTile<ITreeData>>;

            let dLat = Math.atan2(16384, terrain.geoConverter.radius) / Math.PI * 180;
            let dLong = Math.atan2(16384, terrain.geoConverter.radius * Math.cos(terrain.geoConverter.latZero * Math.PI / 180)) / Math.PI * 180;

            chunckDataGenerator.lat0 = terrain.geoConverter.latZero - dLat;
            chunckDataGenerator.long0 = terrain.geoConverter.longZero - dLong;
            chunckDataGenerator.lat1 = terrain.geoConverter.latZero + dLat;
            chunckDataGenerator.long1 = terrain.geoConverter.longZero + dLong;

            chunckDataGenerator.treeTiles.tiles.forEach(tile => {
                tile.dataArray.forEach(t => {
                    t.n = Math.floor(Math.random() * treesVoxelDrawingDatas.length);
                    let x = (t.long - chunckDataGenerator.long0) / (chunckDataGenerator.long1 - chunckDataGenerator.long0);
                    let y = (t.lat - chunckDataGenerator.lat0) / (chunckDataGenerator.lat1 - chunckDataGenerator.lat0);
                    t.iGlobal = Math.floor(x * terrain.chunckLengthIJ * terrain.chunckCountIJ);
                    t.jGlobal = Math.floor(y * terrain.chunckLengthIJ * terrain.chunckCountIJ);
                });
            });

            
            chunckDataGenerator.treeTiles = props.treeTiles as IDataTilesCollection<IDataTile<ITreeData>>;
            if (props.roadTiles) {
                let tags: UniqueList<string> = new UniqueList<string>();
                let widthByType: { [type: string]: number } = {};
                widthByType["secondary_link"] = 6;
                widthByType["tertiary"] = 6;
                widthByType["living_street"] = 6;
                widthByType["residential"] = 6;
                widthByType["service"] = 2;
                widthByType["pedestrian"] = 2;
                widthByType["unclassified"] = 2;
                widthByType["primary"] = 8;
                widthByType["secondary"] = 6;
                widthByType["cycleway"] = 2;
                widthByType["footway"] = 2;
                widthByType["construction"] = 2;
                widthByType["tertiary_link"] = 2;
                widthByType["path"] = 2;
                widthByType["steps"] = 2;
                widthByType["busway"] = 2;
                widthByType["primary_link"] = 2;
                widthByType["track"] = 2;
                widthByType["corridor"] = 2;
                widthByType["elevator"] = 2;
                chunckDataGenerator.roadTiles = props.roadTiles as IDataTilesCollection<IDataTile<IRoadData>>;
                for (let roadTile of chunckDataGenerator.roadTiles.tiles) {
                    for (let roadData of roadTile.dataArray) {
                        roadData.w = widthByType[roadData.type] ?? 2;
                        tags.push(...roadData.type);
                    }
                }
                console.log("road tags: " + tags.array.join(", "));
            }

            return chunckDataGenerator;
        }
        let chunckDataGenerator = new ChunckDataGeneratorFlat(terrain);
            chunckDataGenerator.blockType = BlockType.Dirt;
            chunckDataGenerator.altitude = 5;
        return chunckDataGenerator;
    }
}
