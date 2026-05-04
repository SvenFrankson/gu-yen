import { ChunckDataGenerator, IChunckGeneratorProperties, GeneratorType } from "./ChunckDataGenerator";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../Chunck";
import { BlockType } from "../BlockType";
import { BicubicInterpolate, BilinearInterpolate, MinMax } from "../../Number";
import { Oak } from "./RawProp/Tree";

export interface ITreeData {
    lat: number;
    long: number;
    iGlobal: number;
    jGlobal: number;
    h: number;
    d: number;
}

export interface ITreeTile {
    i: number;
    j: number;
    trees: ITreeData[];
}

export class ChunckDataGeneratorDataSets extends ChunckDataGenerator {

    public size: number = 1024;
    public noiseSize: number = 1024;
    public squareSize: number = 2;
    public url: string = "";
    public noiseUrl: string = "";
    private _data: number[] | undefined = undefined;
    private _noiseData: number[] | undefined = undefined;
    public treeTiles: ITreeTile[] = [];

    public lat0: number = 0;
    public lat1: number = 0
    public long0: number = 0;
    public long1: number = 0;

    private oaks: Oak[] = [];
    public getOak(height: number): Oak {
        let h = Math.floor(height);
        let oak = this.oaks.find(o => o.height === h);
        if (!oak) {
            oak = new Oak(h);
            this.oaks.push(oak);
        }
        return oak;
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
                                //this._data[i + j * this.size] = this.rgbToHeight(r, g, b, this.stops);
                                let h = (r + g + b) / 3;
                                h = h / 255 * (150 - (-20)) - 20;
                                this._data[i + j * this.size] = h;
                            }
                        }
                    }

                    for (let n = 0; n < 1; n++) {
                        let dataClone = [];
                        for (let ii = 0; ii < this.size; ii++) {
                            for (let jj = 0; jj < this.size; jj++) {
                                let v = 0;
                                for (let di = -1; di <= 1; di++) {
                                    for (let dj = -1; dj <= 1; dj++) {
                                        let i = ii + di;
                                        let j = jj + dj;
                                        if (i < 0) i = 0;
                                        if (i >= this.size) i = this.size - 1;
                                        if (j < 0) j = 0;
                                        if (j >= this.size) j = this.size - 1;
                                        v += this._data[i + j * this.size]!;
                                    }
                                }
                                dataClone[ii + jj * this.size] = v / 9;
                            }
                        }
                        this._data = dataClone;
                    }

                    resolve(this._data);
                };
            });
        } else {
            return this._data;
        }
    }

    private async _getNoiseData(): Promise<number[] | undefined> {
        if (!this._noiseData && this.noiseUrl && this.noiseUrl != "") {
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

    public async asyncEvaluateHeight(iGlobal: number, jGlobal: number): Promise<number> {
        let heightMap = await this._getData();
        if (heightMap) {
            return this.evaluateHeight(heightMap, iGlobal, jGlobal);
        }
        return 0;
    }

    public evaluateHeight(heightMap: number[], iGlobal: number, jGlobal: number): number {
        let i1 = Math.floor(iGlobal / this.squareSize);
        let i0 = i1 - 1;
        let i2 = i1 + 1;
        let i3 = i1 + 2;

        let j1 = Math.floor(jGlobal / this.squareSize);
        let j0 = j1 - 1;
        let j2 = j1 + 1;
        let j3 = j1 + 2;

        let v00 = heightMap[i0 + j0 * this.size];
        let v10 = heightMap[i1 + j0 * this.size];
        let v20 = heightMap[i2 + j0 * this.size];
        let v30 = heightMap[i3 + j0 * this.size];
        let v01 = heightMap[i0 + j1 * this.size];
        let v11 = heightMap[i1 + j1 * this.size];
        let v21 = heightMap[i2 + j1 * this.size];
        let v31 = heightMap[i3 + j1 * this.size];
        let v02 = heightMap[i0 + j2 * this.size];
        let v12 = heightMap[i1 + j2 * this.size];
        let v22 = heightMap[i2 + j2 * this.size];
        let v32 = heightMap[i3 + j2 * this.size];
        let v03 = heightMap[i0 + j3 * this.size];
        let v13 = heightMap[i1 + j3 * this.size];
        let v23 = heightMap[i2 + j3 * this.size];
        let v33 = heightMap[i3 + j3 * this.size];

        let h = BicubicInterpolate(iGlobal / this.squareSize - i1, jGlobal / this.squareSize - j1, v00, v10, v20, v30, v01, v11, v21, v31, v02, v12, v22, v32, v03, v13, v23, v33);

        return h;
    }

    public async initializeData(chunck: Chunck): Promise<boolean> {
        let m = DRAW_CHUNCK_MARGIN;

        if (!chunck.dataInitialized) {
            let heightMap = await this._getData();
            if (!heightMap) {
                return false;
            }

            let noiseMap = await this._getNoiseData();

            for (let i: number = -m; i < chunck.chunckLengthIJ + m; i++) {
                for (let j: number = -m; j < chunck.chunckLengthIJ + m; j++) {
                    let iGlobal = (i + chunck.chunckLengthIJ * chunck.iPos);
                    
                    let jGlobal = (j + chunck.chunckLengthIJ * chunck.jPos);

                    let h = this.evaluateHeight(heightMap, iGlobal, jGlobal);

                    let iGlobalNoise = Math.floor(i + chunck.chunckLengthIJ * chunck.iPos);
                    while (iGlobalNoise < 0) iGlobalNoise += this.noiseSize;
                    iGlobalNoise = iGlobalNoise % this.noiseSize;
                    let jGlobalNoise = Math.floor(j + chunck.chunckLengthIJ * chunck.jPos);
                    while (jGlobalNoise < 0) jGlobalNoise += this.noiseSize;
                    jGlobalNoise = jGlobalNoise % this.noiseSize;

                    if (noiseMap) {
                        let noiseValue = noiseMap[iGlobalNoise + jGlobalNoise * this.noiseSize] / 255 - 0.5;
                        h += noiseValue * 4;
                    }

                    let block = BlockType.Grass;

                    for (let k: number = 0; k <= chunck.chunckLengthK; k++) {
                        let kGlobal = k * chunck.levelFactor;

                        if (kGlobal < h) {
                            chunck.setRawData(block, i + m, j + m, k);
                        }
                    }
                }
            }

            let treeTileI = Math.floor(chunck.iPos / this.terrain.chunckCountIJ * 512);
            let treeTileJ = Math.floor(chunck.jPos / this.terrain.chunckCountIJ * 512);
            for (let i = treeTileI - 1; i <= treeTileI + 1; i++) {
                for (let j = treeTileJ - 1; j <= treeTileJ + 1; j++) {
                    let treeTile = this.treeTiles.find(t => t.i === i && t.j === j);
                    if (treeTile) {
                        for (let treeData of treeTile.trees) {
                            if (treeData.d > 10) {
                                let k = Math.floor(this.evaluateHeight(heightMap, treeData.iGlobal, treeData.jGlobal));
                                let oak = this.getOak(Math.floor(treeData.h));
                                oak.draw(treeData.iGlobal - chunck.iPos * chunck.chunckLengthIJ, treeData.jGlobal - chunck.jPos * chunck.chunckLengthIJ, k, chunck);
                            }
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
