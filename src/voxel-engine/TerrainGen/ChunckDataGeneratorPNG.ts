import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { BlockType } from "../BlockType";
import { BicubicInterpolate, MinMax } from "../../Number";

export type Stop = { rgb: [number, number, number]; h: number };

export class ChunckDataGeneratorPNG extends ChunckDataGenerator {
    public size: number = 1024;
    public noiseSize: number = 1024;
    public squareSize: number = 2;
    public url: string = "";
    public noiseUrl: string = "";
    private _data: number[] | undefined = undefined;
    private _noiseData: number[] | undefined = undefined;

    private stops: Stop[] = [
        { rgb: [64, 206, 255], h: -4 },
        { rgb: [64, 207, 255], h: -1 },
        { rgb: [64, 239, 255], h: 4 },
        { rgb: [64, 255, 242], h: 8 },
        { rgb: [64, 255, 201], h: 14 },
        { rgb: [64, 255, 167], h: 19},
        { rgb: [64, 255, 127], h: 25 },
        { rgb: [64, 255, 87], h: 31 },
        { rgb: [79, 255, 64], h: 37 },
        { rgb: [117, 255, 64], h: 43 },
        { rgb: [162, 255, 64], h: 50 },
        { rgb: [199, 255, 64], h: 56 },
        { rgb: [243, 255, 64], h: 63 },
        { rgb: [255, 224, 64], h: 70 },
        { rgb: [255, 181, 64], h: 77 },
        { rgb: [255, 138, 64], h: 84 },
        { rgb: [255, 95, 64], h: 91 },
        { rgb: [255, 75, 75], h: 98 },
        { rgb: [255, 123, 123], h: 106 },
        { rgb: [255, 165, 165], h: 113},
    ];

    private clamp(x: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, x));
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private rgbToHeight(r: number, g: number, b: number, stops: Stop[]): number {
        let bestHeight = stops[0].h;
        let bestDist2 = Infinity;

        for (let i = 0; i < stops.length - 1; i++) {
            const [r1, g1, b1] = stops[i].rgb;
            const [r2, g2, b2] = stops[i + 1].rgb;

            const vr = r2 - r1;
            const vg = g2 - g1;
            const vb = b2 - b1;

            const wr = r - r1;
            const wg = g - g1;
            const wb = b - b1;

            const vv = vr * vr + vg * vg + vb * vb;
            const t = vv > 0 ? this.clamp((wr * vr + wg * vg + wb * vb) / vv, 0, 1) : 0;

            const pr = this.lerp(r1, r2, t);
            const pg = this.lerp(g1, g2, t);
            const pb = this.lerp(b1, b2, t);

            const dr = r - pr;
            const dg = g - pg;
            const db = b - pb;
            const dist2 = dr * dr + dg * dg + db * db;

            if (dist2 < bestDist2) {
                bestDist2 = dist2;
                bestHeight = this.lerp(stops[i].h, stops[i + 1].h, t);
            }
        }

        return bestHeight;
    }

    private async _getData(): Promise<number[] | undefined> {
        if (!this._data && this.url) {
            return new Promise<number[] | undefined>((resolve) => {
                let image = document.createElement("img");
                image.src = this.url;
                image.onload = () => {
                    let canvas = document.createElement("canvas");
                    this.size = Math.min(image.width, image.height);
                    console.log("Image loaded, size: " + this.size);
                    canvas.width = this.size;
                    canvas.height = this.size;
                    this._data = new Array(this.size * this.size);
                    let ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(image, 0, 0);
                        let imageData = ctx.getImageData(0, 0, this.size, this.size).data;
                        for (let i = 0; i < this.size; i++) {
                            for (let j = 0; j < this.size; j++) {
                                let index = i + (this.size - 1 - j) * this.size;
                                let r = imageData[4 * index];
                                let g = imageData[4 * index + 1];
                                let b = imageData[4 * index + 2];
                                this._data[i + j * this.size] = this.rgbToHeight(r, g, b, this.stops);
                            }
                        }
                    }
                    resolve(this._data);
                };
            });
        } else {
            return this._data;
        }
    }

    private async _getNoiseData(): Promise<number[] | undefined> {
        if (!this._noiseData && this.noiseUrl) {
            return new Promise<number[] | undefined>((resolve) => {
                let image = document.createElement("img");
                image.src = this.noiseUrl;
                image.onload = () => {
                    let canvas = document.createElement("canvas");
                    this.noiseSize = Math.min(image.width, image.height);
                    console.log("Noise Image loaded, size: " + this.noiseSize);
                    canvas.width = this.noiseSize;
                    canvas.height = this.noiseSize;
                    this._noiseData = new Array(this.noiseSize * this.noiseSize);
                    let ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(image, 0, 0);
                        let imageData = ctx.getImageData(0, 0, this.noiseSize, this.noiseSize).data;
                        for (let i = 0; i < this.noiseSize; i++) {
                            for (let j = 0; j < this.noiseSize; j++) {
                                let index = i + (this.noiseSize - 1 - j) * this.noiseSize;
                                let r = imageData[4 * index];
                                this._noiseData[i + j * this.noiseSize] = r;
                            }
                        }
                    }
                    resolve(this._noiseData);
                };
            });
        } else {
            return this._noiseData;
        }
    }

    public async initializeData(chunck: Chunck): Promise<boolean> {
        let m = DRAW_CHUNCK_MARGIN;

        if (!chunck.dataInitialized) {
            let heightmap = await this._getData();
            if (!heightmap) {
                return false;
            }

            let noiseMap = await this._getNoiseData();
            if (!noiseMap) {
                return false;
            }

            for (let i: number = -m; i < chunck.chunckLengthIJ + m; i++) {
                for (let j: number = -m; j < chunck.chunckLengthIJ + m; j++) {
                    let iGlobal = (i + chunck.chunckLengthIJ * chunck.iPos) / this.squareSize;
                    while (iGlobal < 0) iGlobal += this.size;
                    while (iGlobal >= this.size) iGlobal -= this.size;
                    
                    let jGlobal = (j + chunck.chunckLengthIJ * chunck.jPos) / this.squareSize;
                    while (jGlobal < 0) jGlobal += this.size;
                    while (jGlobal >= this.size) jGlobal -= this.size;

                    let i1 = Math.floor(iGlobal);
                    let i0 = i1 - 1;
                    let i2 = i1 + 1;
                    let i3 = i1 + 2;

                    let j1 = Math.floor(jGlobal);
                    let j0 = j1 - 1;
                    let j2 = j1 + 1;
                    let j3 = j1 + 2;

                    let v00 = heightmap[i0 + j0 * this.size];
                    let v10 = heightmap[i1 + j0 * this.size];
                    let v20 = heightmap[i2 + j0 * this.size];
                    let v30 = heightmap[i3 + j0 * this.size];
                    let v01 = heightmap[i0 + j1 * this.size];
                    let v11 = heightmap[i1 + j1 * this.size];
                    let v21 = heightmap[i2 + j1 * this.size];
                    let v31 = heightmap[i3 + j1 * this.size];
                    let v02 = heightmap[i0 + j2 * this.size];
                    let v12 = heightmap[i1 + j2 * this.size];
                    let v22 = heightmap[i2 + j2 * this.size];
                    let v32 = heightmap[i3 + j2 * this.size];
                    let v03 = heightmap[i0 + j3 * this.size];
                    let v13 = heightmap[i1 + j3 * this.size];
                    let v23 = heightmap[i2 + j3 * this.size];
                    let v33 = heightmap[i3 + j3 * this.size];

                    let h = BicubicInterpolate(iGlobal - i1, jGlobal - j1, v00, v10, v20, v30, v01, v11, v21, v31, v02, v12, v22, v32, v03, v13, v23, v33);

                    h += 10;

                    let iGlobalNoise = Math.floor(i + chunck.chunckLengthIJ * chunck.iPos);
                    while (iGlobalNoise < 0) iGlobalNoise += this.noiseSize;
                    iGlobalNoise = iGlobalNoise % this.noiseSize;
                    let jGlobalNoise = Math.floor(j + chunck.chunckLengthIJ * chunck.jPos);
                    while (jGlobalNoise < 0) jGlobalNoise += this.noiseSize;
                    jGlobalNoise = jGlobalNoise % this.noiseSize;

                    let noiseValue = noiseMap[iGlobalNoise + jGlobalNoise * this.noiseSize] / 255 - 0.5;
                    h += noiseValue * 6;

                    let block = BlockType.Grass;

                    for (let k: number = 0; k <= chunck.chunckLengthK; k++) {
                        let kGlobal = k * chunck.levelFactor;

                        if (kGlobal < h) {
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
            url: this.url,
        };
    }
}
