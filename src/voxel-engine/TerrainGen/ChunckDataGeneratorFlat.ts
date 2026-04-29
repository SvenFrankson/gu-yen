import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { BlockType } from "../BlockType";
import { RawCoumpoundProp } from "./RawProp/RawProp";
import { IsVeryFinite } from "../../Number";

export class ChunckDataGeneratorFlat extends ChunckDataGenerator {

    public altitude: number = 0;
    public blockType: BlockType = BlockType.Grass;

    public prop: RawCoumpoundProp | undefined;

    public async initializeData(chunck: Chunck): Promise<boolean> {
        let m = DRAW_CHUNCK_MARGIN;

        if (!chunck.dataInitialized) {

            let h = IsVeryFinite(this.altitude) ? this.altitude : this.terrain.chunckLengthK * 0.5;

            for (let k: number = 0; k <= h; k++) {
                chunck.fillRawData(this.blockType, k);
            }
            if (this.terrain.finiteEdges) {
                if (chunck.isWorldEdge) {
                    if (chunck.iPos === 0) {
                        for (let i: number = - m; i <= 0; i++) {
                            for (let j: number = - m; j < chunck.chunckLengthIJ + m; j++) {
                                for (let k: number = 0; k <= h; k++) {
                                    chunck.setRawData(BlockType.None, i + m, j + m, k);
                                }
                            }
                        }
                    }
                    if (chunck.iPos === this.terrain.chunckCountIJ - 1) {
                        for (let i: number = chunck.chunckLengthIJ - 0; i < chunck.chunckLengthIJ + m; i++) {
                            for (let j: number = - m; j < chunck.chunckLengthIJ + m; j++) {
                                for (let k: number = 0; k <= h; k++) {
                                    chunck.setRawData(BlockType.None, i + m, j + m, k);
                                }
                            }
                        }
                    }
                    if (chunck.jPos === 0) {
                        for (let i: number = - m; i < chunck.chunckLengthIJ + m; i++) {
                            for (let j: number = - m; j <= 0; j++) {
                                for (let k: number = 0; k <= h; k++) {
                                    chunck.setRawData(BlockType.None, i + m, j + m, k);
                                }
                            }
                        }
                    }
                    if (chunck.jPos === this.terrain.chunckCountIJ - 1) {
                        for (let i: number = - m; i < chunck.chunckLengthIJ + m; i++) {
                            for (let j: number = chunck.chunckLengthIJ - 0; j < chunck.chunckLengthIJ + m; j++) {
                                for (let k: number = 0; k <= h; k++) {
                                    chunck.setRawData(BlockType.None, i + m, j + m, k);
                                }
                            }
                        }
                    }
                }
            }

            if (this.prop) {
                let i = Math.floor(this.terrain.terrainLengthIJ * 0.5) - chunck.iPos * chunck.terrain.chunckLengthIJ;
                let j = Math.floor(this.terrain.terrainLengthIJ * 0.5) - chunck.jPos * chunck.terrain.chunckLengthIJ;
                let k = this.altitude;
                
                this.prop.draw(i, j, k, chunck);
            }

            return true;
        }

        return false;
    }

    public getProps(): IChunckGeneratorProperties {
        return {
            type: GeneratorType.Flat,
            blockType: this.blockType,
            altitude: this.altitude
        }
    }
}
