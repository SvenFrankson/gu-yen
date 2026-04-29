import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { BlockType } from "../BlockType";
import { MinMax } from "../../Number";

export class ChunckDataGeneratorPNG extends ChunckDataGenerator {

    public size: number = 1024;
    public squareSize: number = 2;
    public url: string = "";
    private _data: Uint8ClampedArray | undefined;

    private async _getData(): Promise<Uint8ClampedArray | undefined> {
        if (!this._data && this.url) {
            return new Promise<Uint8ClampedArray | undefined>(resolve => {
                let image = document.createElement("img");
                image.src = this.url;
                image.onload = () => {
                    let canvas = document.createElement("canvas");
                    this.size = Math.min(image.width, image.height);
                    canvas.height = this.size;
                    let ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(image, 0, 0);
                        this._data = ctx.getImageData(0, 0, this.size, this.size).data;
                    }
                    resolve(this._data);
                }
            });
        }
        else {
            return this._data;
        }
    }
    
    public async initializeData(chunck: Chunck): Promise<boolean> {
        
        let m = DRAW_CHUNCK_MARGIN;

        if (!chunck.dataInitialized) {

            let heightmap = await this._getData();
            if (!heightmap) {
                return false;
            }

            for (let i: number = - m; i < chunck.chunckLengthIJ + m; i++) {
                for (let j: number = - m; j < chunck.chunckLengthIJ + m; j++) {

                    let iGlobal = Math.floor((i + chunck.chunckLengthIJ * chunck.iPos) / this.squareSize);
                    iGlobal = MinMax(iGlobal, 0, this.size - 1);
                    let jGlobal = Math.floor((j + chunck.chunckLengthIJ * chunck.jPos) / this.squareSize);
                    jGlobal = MinMax(jGlobal, 0, this.size - 1);

                    let hDirt = heightmap[4 * (iGlobal + jGlobal * this.size)];
                    let hGrass = heightmap[4 * (iGlobal + jGlobal * this.size) + 1];
                    let hRock = heightmap[4 * (iGlobal + jGlobal * this.size) + 2];

                    let h = (hDirt + hGrass + hRock) / 3;
                    let block = BlockType.Grass;
                    if (hDirt > hGrass && hDirt > hRock) {
                        block = BlockType.Dirt;
                    }
                    else if (hRock > hDirt && hRock > hGrass) {
                        block = BlockType.Rock;
                    }

                    for (let k: number = 0; k <= chunck.chunckLengthK; k++) {
                        let kGlobal = k * chunck.levelFactor;

                        if (kGlobal <= h) {
                            chunck.setRawData(block, i + m, j + m, k);
                        }
                    }
                }
            }

            return true;
        }

        return false;
    }

    public getProps(): IChunckGeneratorProperties {
        return {
            type: GeneratorType.PNG,
            squareSize: this.squareSize,
            url: this.url
        }
    }
}
