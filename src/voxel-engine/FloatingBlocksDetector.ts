import { gaussianSplattingDepthVertexShader } from "@babylonjs/core/Shaders/gaussianSplattingDepth.vertex";
import { Chunck } from "./Chunck";
import { Terrain } from "./Terrain";

export class FloatingBlocksDetector {

    public static maxRange: number = 8;
    public static maxSize: number = FloatingBlocksDetector.maxRange * 2 + 1;
    public currentGroup: number = 1;

    public i0: number = FloatingBlocksDetector.maxRange;
    public j0: number = FloatingBlocksDetector.maxRange;
    public k0: number = FloatingBlocksDetector.maxRange;
    public i1: number = FloatingBlocksDetector.maxRange;
    public j1: number = FloatingBlocksDetector.maxRange;
    public k1: number = FloatingBlocksDetector.maxRange;

    public iGlobal0: number = 0;
    public jGlobal0: number = 0
    public kGlobal0: number = 0;

    public grid: Uint8Array = new Uint8Array(FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize);
    public getGridValue(i: number, j: number, k: number): number {
        return this.grid[i + j * FloatingBlocksDetector.maxSize + k * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize];
    }
    public markBlock(i: number, j: number, k: number) {
        let groupsFound: number[] = [];
        let group: number = 0;

        this.i0 = Math.min(this.i0, i);
        this.j0 = Math.min(this.j0, j);
        this.k0 = Math.min(this.k0, k);
        this.i1 = Math.max(this.i1, i);
        this.j1 = Math.max(this.j1, j);
        this.k1 = Math.max(this.k1, k);

        for (let ii = Math.max(this.i0, i - 1); ii <= Math.min(this.i1, i + 1); ii++) {
            for (let jj = Math.max(this.j0, j - 1); jj <= Math.min(this.j1, j + 1); jj++) {
                for (let kk = Math.max(this.k0, k - 1); kk <= Math.min(this.k1, k + 1); kk++) {
                    if (ii === i && jj === j && kk === k) continue;
                    const i2 = ii;
                    const j2 = jj;
                    const k2 = kk;
                    const g = this.getGridValue(i2, j2, k2);
                    if (g > 0) {
                        if (!groupsFound.includes(g)) {
                            groupsFound.push(g);
                        }
                    }
                }
            }
        }
        if (groupsFound.length > 1) {
            group = Math.min(...groupsFound);
            for (let i = 0; i < groupsFound.length; i++) {
                const g = groupsFound[i];
                if (g !== group) {
                    for (let ii = this.i0; ii <= this.i1; ii++) {
                        for (let jj = this.j0; jj <= this.j1; jj++) {
                            for (let kk = this.k0; kk <= this.k1; kk++) {
                                if (this.getGridValue(ii, jj, kk) === g) {
                                    this.grid[ii + jj * FloatingBlocksDetector.maxSize + kk * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize] = group;
                                }
                            }
                        }
                    }
                    this.currentGroup--;
                }
            }
        }
        else if (groupsFound.length === 1) {
            group = groupsFound[0];
        }
        if (groupsFound.length === 0) {
            group = this.currentGroup++;
        }

        this.grid[i + j * FloatingBlocksDetector.maxSize + k * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize] = group;
    }

    constructor(public terrain: Terrain) {
        this.reset();
    }

    public reset() {
        this.grid.fill(0);
        this.i0 = FloatingBlocksDetector.maxRange;
        this.j0 = FloatingBlocksDetector.maxRange;
        this.k0 = FloatingBlocksDetector.maxRange;
        this.i1 = FloatingBlocksDetector.maxRange;
        this.j1 = FloatingBlocksDetector.maxRange;
        this.k1 = FloatingBlocksDetector.maxRange;
        this.currentGroup = 1;
    }

    public findFloatingBlocks(iGlobal0: number, jGlobal0: number, kGlobal0: number) {
        this.reset();
        this.iGlobal0 = iGlobal0;
        this.jGlobal0 = jGlobal0;
        this.kGlobal0 = kGlobal0;

        let chunk = this.terrain.getChunck(0, Math.floor(iGlobal0 / this.terrain.chunckLengthIJ), Math.floor(jGlobal0 / this.terrain.chunckLengthIJ));
        if (!chunk) return;
        let iPos0 = chunk.iPos;
        let jPos0 = chunk.jPos;
        let chuncks: Chunck[][] = [];
        for (let i = 0; i <= 2; i++) {
            chuncks[i] = [];
            for (let j = 0; j <= 2; j++) {
                let c = this.terrain.getChunck(0, iPos0 + i - 1, jPos0 + j - 1);
                if (c) {
                    chuncks[i][j] = c;
                }
            }
        }

        for (let d = 1; d < FloatingBlocksDetector.maxRange; d++) {
            let doThing = (ii: number, jj: number, kk: number) => {
                let iGlobal = iGlobal0 + ii;
                let jGlobal = jGlobal0 + jj;
                let kGlobal = kGlobal0 + kk;

                let iPos = Math.floor(iGlobal / this.terrain.chunckLengthIJ);
                let jPos = Math.floor(jGlobal / this.terrain.chunckLengthIJ);
                let chunck = chuncks[iPos - iPos0]?.[jPos - jPos0];
                if (chunck) {
                    let i = iGlobal - chunck.iPos * this.terrain.chunckLengthIJ;
                    let j = jGlobal - chunck.jPos * this.terrain.chunckLengthIJ;
                    let blockType = chunck.getData(i, j, kGlobal);
                    if (blockType > 0) {
                        this.markBlock(ii + FloatingBlocksDetector.maxRange, jj + FloatingBlocksDetector.maxRange, kk + FloatingBlocksDetector.maxRange);
                    }
                }
            }

            for (let ii = -d; ii <= d; ii++) {
                for (let jj = -d; jj <= d; jj++) {
                    for (let kk of [-d, d]) {
                        doThing(ii, jj, kk);
                    }
                }
            }
            for (let ii = -d; ii <= d; ii++) {
                for (let jj of [-d, d]) {
                    for (let kk = - d + 1; kk <= d - 1; kk++) {
                        doThing(ii, jj, kk);
                    }
                }
            }
            for (let ii of [-d, d]) {
                for (let jj = -d + 1; jj <= d - 1; jj++) {
                    for (let kk = - d + 1; kk <= d - 1; kk++) {
                        doThing(ii, jj, kk);
                    }
                }
            }
            if (this.currentGroup <= 2) {
                console.log("No floating blocks found at distance", d);
                return;
            }
        }

        console.log("Floating blocks groups found:", this.currentGroup - 1);
    }
}