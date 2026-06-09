import { NextFrame } from "../../Tools";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { ITerrainData } from "../Save/GameSave";
import { Terrain } from "../Terrain";
import { ChunckDataGenerator, GeneratorType, IChunckGeneratorProperties } from "./ChunckDataGenerator";
import { ChunkData } from "./ChunkData";

export class ChunkDataManager {
    
    public terrain: Terrain;
    public generator: ChunckDataGenerator;
    private loadedChunkData: ChunkData[] = [];


    constructor(generator: ChunckDataGenerator, terrain: Terrain) {
        this.generator = generator;
        this.terrain = terrain;
    }

    public async getChunkData(iPos: number, jPos: number): Promise<ChunkData> {
        let chunkData = this.loadedChunkData.find(cd => cd.iPos === iPos && cd.jPos === jPos);
        if (!chunkData) {
            chunkData = new ChunkData(iPos, jPos, this.terrain);
            this.loadedChunkData.push(chunkData);
            await this.generator.initializeData(chunkData);
            chunkData.dataInitialized = true;
        }
        while (!chunkData.dataInitialized) {
            await NextFrame();
        }
        return chunkData;
    }
}

export class ChunckDataGeneratorFromManager extends ChunckDataGenerator {

    public manager: ChunkDataManager;

    constructor(manager: ChunkDataManager, terrain: Terrain) {
        super(terrain);
        this.manager = manager;
    }

    public async initializeData(chunck: Chunck): Promise<boolean> {
        let m = DRAW_CHUNCK_MARGIN;
        let chunkDataCore: ChunkData[][] = [];
        for (let i = 0; i <= 2; i++) {
            chunkDataCore[i] = [];
            for (let j = 0; j <= 2; j++) {
                let chunkData = await this.manager.getChunkData(chunck.iPos + i - 1, chunck.jPos + j - 1);
                chunkDataCore[i][j] = chunkData;
            }
        }

        for (let k: number = 0; k < chunck.chunckLengthK; k++) {
            let filled = chunkDataCore[1][1].getFilledRawData(k);
            if (filled != null) {
                for (let i = 0 ; i < 2; i++) {
                    for (let j = 0; j < 2; j++) {
                        if (chunkDataCore[i][j].getFilledRawData(k) != filled) {
                            filled = null;
                            i = Infinity;
                            j = Infinity;
                        }
                    }
                }
            }

            if (filled != null) {
                chunck.fillRawData(filled, k);
            }
            else {
                for (let i: number = - m; i < chunck.chunckLengthIJ + m; i++) {
                    for (let j: number = - m; j < chunck.chunckLengthIJ + m; j++) {
                        let ii: number = i;
                        let iCore = 1;
                        if (i < 0) {
                            iCore = 0;
                            ii = i + chunck.chunckLengthIJ;
                        }
                        else if (i >= chunck.chunckLengthIJ) {
                            iCore = 2;
                            ii = i - chunck.chunckLengthIJ;
                        }
                        let jj: number = j;
                        let jCore = 1;
                        if (j < 0) {
                            jCore = 0;
                            jj = j + chunck.chunckLengthIJ;
                        }
                        else if (j >= chunck.chunckLengthIJ) {
                            jCore = 2;
                            jj = j - chunck.chunckLengthIJ;
                        }
                        let block = chunkDataCore[iCore][jCore].getRawData(ii, jj, k);
                        chunck.setRawData(block, i + m, j + m, k);
                    }
                }
            }
        }
        return true;
    }

    public getProps(): IChunckGeneratorProperties {
        return {
            type: GeneratorType.Manager
        }
    }
}