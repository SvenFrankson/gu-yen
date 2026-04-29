import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { BlockType } from "../BlockType";

export class ChunckDataGeneratorEmpty extends ChunckDataGenerator {

    public async initializeData(chunck: Chunck): Promise<boolean> {
        
        let m = DRAW_CHUNCK_MARGIN;

        if (!chunck.dataInitialized) {

            for (let i: number = - m; i < chunck.chunckLengthIJ + m; i++) {
                for (let j: number = - m; j < chunck.chunckLengthIJ + m; j++) {
                    for (let k: number = 0; k < chunck.chunckLengthK; k++) {
                        chunck.setRawData(BlockType.None, i + m, j + m, k);
                    }
                }
            }

            return true;
        }
    }

    public getProps(): IChunckGeneratorProperties {
        return {
            type: GeneratorType.Empty
        }
    }
}
