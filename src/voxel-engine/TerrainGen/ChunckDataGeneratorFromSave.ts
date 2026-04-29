import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck } from "../Chunck";
import { ITerrainData } from "../Save/GameSave";

export class ChunckDataGeneratorFromSave extends ChunckDataGenerator {

    public async initializeData(chunck: Chunck): Promise<boolean> {
        let terrainSave: ITerrainData = chunck.terrain.save.data.terrain;
        if (terrainSave) {
            let chunckSave = terrainSave.chuncks.find(c => { return c.name === chunck.name; });
            if (chunckSave) {
                chunck.deserializeData2(chunckSave.data);
            
                for (let k = 0; k < chunck.dataSizeK; k++) {
                    chunck.updateIsEmptyIsFull(k);
                }
                
                return true;
            }
        }

        return false;
    }

    public getProps(): IChunckGeneratorProperties {
        return {
            type: GeneratorType.NotAGenerator
        }
    }
}
