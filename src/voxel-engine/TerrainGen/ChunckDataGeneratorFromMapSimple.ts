import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { BlockType } from "../BlockType";
import { Terrain } from "../Terrain";

export class ChunckDataGeneratorFromMapSimple extends ChunckDataGenerator {

    private _plainMaps: Nabu.TerrainMapGenerator;
    private _grassMaps: Nabu.TerrainMapGenerator;
    private _cells: Nabu.CellMapGenerator;
    private _ijLimits: number[];

    constructor(terrain: Terrain) {
        super(terrain);
        
        let masterSeed = Nabu.MasterSeed.GetFor("Paulita");
        let seededMap = Nabu.SeededMap.CreateFromMasterSeed(masterSeed, 4, 512);
        this._plainMaps = new Nabu.TerrainMapGenerator(seededMap, [1024, 512, 128]);
        
        let grassSeed = Nabu.MasterSeed.GetFor("Grass");
        let grassMap = Nabu.SeededMap.CreateFromMasterSeed(grassSeed, 4, 512);
        this._grassMaps = new Nabu.TerrainMapGenerator(grassMap, 16);

        this._ijLimits = [- DRAW_CHUNCK_MARGIN, terrain.chunckLengthIJ + DRAW_CHUNCK_MARGIN];
    }
    
    public async initializeData(chunck: Chunck): Promise<boolean> {
        
        let m = DRAW_CHUNCK_MARGIN;

        if (!chunck.dataInitialized) {

            let maps: Nabu.TerrainMap[] = [];
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    let iG = this._ijLimits[i] + chunck.chunckLengthIJ * chunck.iPos;
                    let jG = this._ijLimits[j]  + chunck.chunckLengthIJ * chunck.jPos;
                    let iMap = Math.floor(iG / Nabu.TerrainMapGenerator.MAP_SIZE);
                    let jMap = Math.floor(jG / Nabu.TerrainMapGenerator.MAP_SIZE);
                    let heightmap = await this._plainMaps.getMap(iMap, jMap);
                    if (maps.indexOf(heightmap) === -1) {
                        maps.push(heightmap);
                    }
                }
            }

            let min = 255;
            let max = 0;
            maps.forEach(map => {
                min = Math.min(map.min);
                max = Math.max(map.max);
            })

            let altMin = Math.floor(min / 255 * this.terrain.chunckLengthK * 0.5);
            let altMax = Math.floor(max / 255 * this.terrain.chunckLengthK * 0.5);
            for (let k = 0; k < altMin; k++) {
                chunck.fillRawData(BlockType.Rock, k);
            }
            
            for (let k = altMax + 1; k <= chunck.chunckLengthK; k++) {
                chunck.fillRawData(BlockType.None, k);
            }

            for (let j: number = - m; j < chunck.chunckLengthIJ + m; j++) {
                let jGlobal = j + chunck.chunckLengthIJ * chunck.jPos;
                let jMap = Math.floor(jGlobal / Nabu.TerrainMapGenerator.MAP_SIZE);
                for (let i: number = - m; i < chunck.chunckLengthIJ + m; i++) {
                    let iGlobal = i + chunck.chunckLengthIJ * chunck.iPos;
                    let iMap = Math.floor(iGlobal / Nabu.TerrainMapGenerator.MAP_SIZE);

                    // [optimidea] Do not do getMap for each ij, find the i and j at which it changes.
                    let heightmap = maps.length === 1 ? maps[0] : await this._plainMaps.getMap(iMap, jMap);
                    let altitude = Math.floor(heightmap.get(iGlobal % Nabu.TerrainMapGenerator.MAP_SIZE, jGlobal % Nabu.TerrainMapGenerator.MAP_SIZE) / 255 * this.terrain.chunckLengthK * 0.5);
                    let grass = (await this._grassMaps.getMap(iMap, jMap)).get(iGlobal % Nabu.TerrainMapGenerator.MAP_SIZE, jGlobal % Nabu.TerrainMapGenerator.MAP_SIZE) / 255;
                    
                    let k0 = Math.min(altMin, altitude);
                    let k1 = Math.max(altMax, altitude);
                    for (let k: number = k0; k <= k1; k++) {
                        let kGlobal = k * chunck.levelFactor;

                        if (kGlobal < altitude - 1) {
                            chunck.setRawData(BlockType.Rock, i + m, j + m, k);
                        }
                        else if (kGlobal < altitude) {
                            chunck.setRawData(BlockType.Dirt, i + m, j + m, k);
                        }
                        else if (kGlobal === altitude) {
                            if (grass > 0.5) {
                                chunck.setRawData(BlockType.Grass, i + m, j + m, k);
                            }
                            else {
                                chunck.setRawData(BlockType.Dirt, i + m, j + m, k);
                            }
                        }
                    }
                }
            }

            return true;
        }
    }

    public getProps(): IChunckGeneratorProperties {
        return {
            type: GeneratorType.MapSimple
        }
    }
}
