import { SHARE_SERVICE_PATH } from "../../Game";
import { NextFrame } from "../../Tools";
import { BlockType } from "../BlockType";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
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
            try {
                throw new Error("Nope");
                let response = await fetch(SHARE_SERVICE_PATH + "get_tile/" + iPos.toFixed(0) + "/" + jPos.toFixed(0), {
                    method: "GET",
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (response.ok) {
                    let dataText = await response.text();
                    let data = JSON.parse(dataText);
                    let inlineDataB64 = data.dataText;
                    let inlineData = Uint8Array.fromBase64(inlineDataB64);
                    chunkData.deinlineData(inlineData);
                    chunkData.dataInitialized = true;
                }
                else {
                    throw new Error("Failed to load chunk data, status: " + response.status);
                }
            }
            catch (e) {
                await this.generator.initializeData(chunkData);
                chunkData.dataInitialized = true;
                await this.saveChunkData(chunkData);
            }
        }
        while (!chunkData.dataInitialized) {
            await NextFrame();
        }
        return chunkData;
    }

    public async saveChunkData(chunkData: ChunkData): Promise<void> {
        let inlineData = chunkData.inlineData();
        let inlineDataB64 = inlineData.toBase64();
        try {
            let data = {
                i: chunkData.iPos,
                j: chunkData.jPos,
                data: inlineDataB64
            }
            let headers: any = {
                "Content-Type": "application/json",
            };
            let dataString = JSON.stringify(data);
            
            await fetch(SHARE_SERVICE_PATH + "set_tile", {
                method: "POST",
                mode: "cors",
                headers: headers,
                body: dataString,
            });
        }
        catch (e) {
            console.error("Error saving chunk data: ", e);
        }
    }

    public async setBlock(v: BlockType, i: number, j: number, k: number, iPos: number, jPos: number): Promise<void> {
        let chunkData = await this.getChunkData(iPos, jPos);
        chunkData.setRawData(v, i, j, k);
        //await this.saveChunkData(chunkData);
        try {
            let data = {
                iTile: chunkData.iPos,
                jTile: chunkData.jPos,
                i: i,
                j: j,
                k: k,
                value: v
            }
            let headers: any = {
                "Content-Type": "application/json",
            };
            let dataString = JSON.stringify(data);
            
            const response = await fetch(SHARE_SERVICE_PATH + "set_block", {
                method: "POST",
                mode: "cors",
                headers: headers,
                body: dataString,
            });
        }
        catch (e) {
            console.error("Error publishing chunk data: ", e);
        }
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