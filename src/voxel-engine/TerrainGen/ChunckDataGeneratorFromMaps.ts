import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { BlockType } from "../BlockType";
import { MapAttribute } from "../Save/GameSave";
import { RawProp } from "./RawProp/RawProp";
import { Trees } from "../Props/Trees";
import { Cactus } from "./RawProp/Tree";
import { Terrain } from "../Terrain";

export class ChunckDataGeneratorFromMaps extends ChunckDataGenerator {

    public useTunnels: boolean = false;
    public useRock: boolean = false;

    private _plainMaps: Nabu.TerrainMapGenerator;
    private _mountainMaps: Nabu.TerrainMapGenerator;
    private _propsMaps: Nabu.PointsMapGenerator;
    private _cells: Nabu.CellMapGenerator;
    private _ijLimits: number[];
    private _propsPoints: Nabu.Point[] = [];

    public debugProp: (RawProp | ((n: number) => RawProp))[];

    private _testBiomeBlocks = [
        BlockType.Grass,
        BlockType.Snow,
        BlockType.Sand
    ]
    private _testBiomeBlocksLowW = [
        BlockType.Dirt,
        BlockType.Rock,
        BlockType.Sand
    ]

    constructor(terrain: Terrain) {
        super(terrain);
        
        let masterSeed = Nabu.MasterSeed.GetFor("Paulita");
        let seededMap = Nabu.SeededMap.CreateFromMasterSeed(masterSeed, 4, 512);
        this._plainMaps = new Nabu.TerrainMapGenerator(seededMap, [4096, 1024, 512, 128]);

        let masterSeedMoutain = Nabu.MasterSeed.GetFor("MoutainsOfPaulita");
        let seededMapMoutain = Nabu.SeededMap.CreateFromMasterSeed(masterSeedMoutain, 4, 512);
        this._mountainMaps = new Nabu.TerrainMapGenerator(seededMapMoutain, 32);
        
        let masterSeedProps = Nabu.MasterSeed.GetFor("PavliProps");
        let seededMapProps = Nabu.SeededMap.CreateFromMasterSeed(masterSeedProps, 4, 512);
        this._propsMaps = new Nabu.PointsMapGenerator(seededMapProps);

        this._cells = new Nabu.CellMapGenerator(seededMap, 8, 64);
        this._ijLimits = [- DRAW_CHUNCK_MARGIN, terrain.chunckLengthIJ + DRAW_CHUNCK_MARGIN];

        let trees = new Trees();
        trees.initialize();
        this.debugProp = [
            (n) => { return trees.getTree(n); },
            undefined,
            new Cactus()
        ];
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

            let altMin = Math.floor(min / 255 * this.terrain.chunckLengthK);
            let altMax = Math.floor(max / 255 * this.terrain.chunckLengthK);
            for (let k = 0; k < altMin; k++) {
                chunck.fillRawData(BlockType.Rock, k);
            }
            
            for (let k = altMax + 1; k <= chunck.chunckLengthK; k++) {
                chunck.fillRawData(BlockType.None, k);
            }

            let iGlobalMin = this._ijLimits[0] + chunck.chunckLengthIJ * (chunck.iPos - 1);
            let iGlobalMax = this._ijLimits[1] + chunck.chunckLengthIJ * (chunck.iPos + 1);
            let jGlobalMin = this._ijLimits[0] + chunck.chunckLengthIJ * (chunck.jPos - 1);
            let jGlobalMax = this._ijLimits[1] + chunck.chunckLengthIJ * (chunck.jPos + 1);
            this._propsMaps.getPointsToRef(iGlobalMin, iGlobalMax, jGlobalMin, jGlobalMax, this._propsPoints);
            let pointsCount = 0;
            while (this._propsPoints[pointsCount]) {
                pointsCount++;
            }

            for (let j: number = - m; j < chunck.chunckLengthIJ + m; j++) {
                let jGlobal = j + chunck.chunckLengthIJ * chunck.jPos;
                let jMap = Math.floor(jGlobal / Nabu.TerrainMapGenerator.MAP_SIZE);
                for (let i: number = - m; i < chunck.chunckLengthIJ + m; i++) {
                    let iGlobal = i + chunck.chunckLengthIJ * chunck.iPos;
                    let iMap = Math.floor(iGlobal / Nabu.TerrainMapGenerator.MAP_SIZE);

                    // [optimidea] Do not do getMap for each ij, find the i and j at which it changes.
                    let heightmap = maps.length === 1 ? maps[0] : await this._plainMaps.getMap(iMap, jMap);
                    let altitude = Math.floor(heightmap.get(iGlobal % Nabu.TerrainMapGenerator.MAP_SIZE, jGlobal % Nabu.TerrainMapGenerator.MAP_SIZE) / 255 * this.terrain.chunckLengthK * 0.75);
                    let biome = this._cells.getBiomeWeights(iGlobal, jGlobal);
                    let moutainWeight = 0;
                    if (biome.w1) {
                        if (biome.v1 === 1) {
                            moutainWeight = Math.max(moutainWeight, biome.w1);
                        }
                    }
                    if (biome.w2) {
                        if (biome.v2 === 1) {
                            moutainWeight = Math.max(moutainWeight, biome.w2);
                        }
                    }
                    if (biome.w3) {
                        if (biome.v3 === 1) {
                            moutainWeight = Math.max(moutainWeight, biome.w3);
                        } 
                    }

                    if (moutainWeight > 0) {
                        let mountainMap = await this._mountainMaps.getMap(iMap, jMap);
                        let moutainAltitude = Math.max(mountainMap.get(iGlobal % Nabu.TerrainMapGenerator.MAP_SIZE, jGlobal % Nabu.TerrainMapGenerator.MAP_SIZE) / 255 - 0.5, 0) / 0.5 * this.terrain.chunckLengthK * 0.25;
                        altitude += moutainAltitude * Nabu.Easing.easeInOutSine(moutainWeight);
                    }

                    altitude = Math.floor(altitude);

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
                            chunck.setRawData(biome.w1 > 0.8 ? this._testBiomeBlocks[biome.v1] : this._testBiomeBlocksLowW[biome.v1], i + m, j + m, k);
                        }
                        else {
                            chunck.setRawData(BlockType.None, i + m, j + m, k);
                        }
                    }
                }
            }

            for (let n = 0; n < pointsCount; n++) {
                let point = this._propsPoints[n];
                let iMap = Math.floor(point.iGlobal / Nabu.TerrainMapGenerator.MAP_SIZE);
                let jMap = Math.floor(point.jGlobal / Nabu.TerrainMapGenerator.MAP_SIZE);
                let heightmap = maps.length === 1 ? maps[0] : await this._plainMaps.getMap(iMap, jMap);
                let altitude = Math.floor(heightmap.get(point.iGlobal % Nabu.TerrainMapGenerator.MAP_SIZE, point.jGlobal % Nabu.TerrainMapGenerator.MAP_SIZE) / 255 * this.terrain.chunckLengthK * 0.75);

                let i = point.iGlobal - chunck.iPos * chunck.terrain.chunckLengthIJ;
                let j = point.jGlobal - chunck.jPos * chunck.terrain.chunckLengthIJ;
                let k = altitude;
                
                let biome = this._cells.getBiomeWeights(point.iGlobal, point.jGlobal);
                let biomest = biome.v1;
                let prop = this.debugProp[biomest];
                if (prop instanceof RawProp) {
                    prop.draw(i, j, k, chunck);
                }
                else if (prop) {
                    prop(point.value).draw(i, j, k, chunck);
                }
            }

            return true;
        }
    }

    public getProps(): IChunckGeneratorProperties {
        let attributes: MapAttribute[] = [];
        if (this.useRock) {
            attributes.push(MapAttribute.Rocks);
        }
        if (this.useTunnels) {
            attributes.push(MapAttribute.Tunnels);
        }
        return {
            type: GeneratorType.Map
        }
    }
}
