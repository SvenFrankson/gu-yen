import { IJK } from "../../Number";
import { BlockType } from "../BlockType";
import { Terrain } from "../Terrain";

export class ChunkData {

    public terrain: Terrain;
    public iPos: number;
    public jPos: number;
    public _data: Uint8Array[] = [];

    public get blockSizeIJ_m(): number {
        return this.terrain.blockSizeIJ_m;
    }
    public get blockSizeK_m(): number {
        return this.terrain.blockSizeK_m;
    }
    public get chunckLengthIJ(): number {
        return this.terrain.chunckLengthIJ;
    }
    public get chunckLengthK(): number {
        return this.terrain.chunckLengthK;
    }
    public get chunckSizeIJ_m(): number {
        return this.terrain.chunckSizeIJ_m;
    }
    public get chunckSizeK_m(): number {
        return this.terrain.chunckSizeK_m;
    }
    private _dataSizeIJ: number;
    public get dataSizeIJ(): number {
        return this._dataSizeIJ;
    }
    private _dataSizeSquare: number;
    public get dataSizeSquare(): number {
        return this._dataSizeSquare;
    }
    private _dataSizeK: number;
    public get dataSizeK(): number {
        return this._dataSizeK;
    }

    private _dataInitialized: boolean = false;
    public get dataInitialized(): boolean {
        return this._dataInitialized;
    }
    public set dataInitialized(v: boolean) {
        this._dataInitialized = v;
    }

    constructor(iPos: number, jPos: number, terrain: Terrain) {
        this.terrain = terrain;
        this.iPos = iPos;
        this.jPos = jPos;

        this._dataSizeIJ = this.chunckLengthIJ;
        this._dataSizeK = this.chunckLengthK;
        this._dataSizeSquare = this._dataSizeIJ * this._dataSizeIJ;

        this._data = [];
        for (let k = 0; k < this._dataSizeK; k++) {
            this._data[k] = new Uint8Array(1);
            this._data[k][0] = BlockType.None;
        }
    }

    public getRawData(i: number, j: number, k: number): number {
        if (this._data[k].length === 1) {
            return this._data[k][0];
        }
        return this._data[k][i + j * this._dataSizeIJ];
    }

    public setRawData(v: number, i: number, j: number, k: number): void {
        if (this._data[k].length === 1) {
            if (this._data[k][0] === v) {
                return;
            }
            let fillVal = this._data[k][0];
            this._data[k] = new Uint8Array(this._dataSizeSquare);
            this._data[k].fill(fillVal);
        }
        this._data[k][i + j * this._dataSizeIJ] = v;
    }

    public fillRawData(v: number, k: number): void {
        this._data[k] = new Uint8Array(1);
        this._data[k][0] = v;
    }
    
    public getFilledRawData(k: number): BlockType | null {
        if (this._data[k].length === 1) {
            return this._data[k][0];
        }
        return null;
    }

    public setRawDataSafe(v: number, i: number, j: number, k: number): boolean {
        if (i < 0 || j < 0 || k < 0 || i >= this._dataSizeIJ || j >= this._dataSizeIJ || k >= this._dataSizeK) {
            return false;
        }
        if (this._data[k].length === 1) {
            if (this._data[k][0] === v) {
                return true;
            }
            let fillVal = this._data[k][0];
            this._data[k] = new Uint8Array(this._dataSizeSquare);
            this._data[k].fill(fillVal);
        }
        this._data[k][i + j * this._dataSizeIJ] = v;
        return true;
    }

    public updateIsEmptyIsFull(k: number): void {
        if (k < 0 || k >= this._dataSizeK) {
            return;
        }
        if (this._data[k].length === 1) {
            return;
        }
        
        let firstBlock = this._data[k][0];
        for (let i = 0; i <= this.chunckLengthIJ; i++) {
            for (let j = 0; j <= this.chunckLengthIJ; j++) {
                let block = this.getRawData(i, j, k);
                if (block != firstBlock) {
                    return;
                }
            }
        }
        this._data[k] = new Uint8Array([firstBlock]);
    }

    public IJKGlobalToIJKLocal(iGlobal: number, jGlobal: number, kGlobal: number): IJK;
    public IJKGlobalToIJKLocal(ijkGlobal: IJK): IJK;
    public IJKGlobalToIJKLocal(a: number | IJK, jGlobal?: number, kGlobal?: number): IJK {
        let iGlobal: number;
        if (typeof(a) === "number") {
            iGlobal = a;
        }
        else {
            iGlobal = a.i;
            jGlobal = a.j;
            kGlobal = a.k;
        }

        if (jGlobal === undefined || kGlobal === undefined) {
            return { i: 0, j: 0, k: 0 };
        }
        let i = Math.floor(iGlobal) - this.chunckLengthIJ * this.iPos;
        let j = Math.floor(jGlobal) - this.chunckLengthIJ * this.jPos;
        let k = Math.floor(kGlobal);
        
        return { i: i, j: j, k: k };
    }
}