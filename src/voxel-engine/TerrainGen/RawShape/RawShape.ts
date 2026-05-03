import { IJK } from "../../../Number";
import { BlockType } from "../../BlockType";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../../Chunck";
export abstract class RawShape {
    constructor(public pi: number = 0, public pj: number = 0, public pk: number = 0) {}

    public abstract draw(block: BlockType, i: number, j: number, k: number, chunck: Chunck): void;
}

export class RawShapeBox extends RawShape {
    constructor(public w: number = 1, public h: number = 1, public d: number = 1, pi?: number, pj?: number, pk?: number) {
        super(pi, pj, pk);
    }

    public draw(block: BlockType, i: number, j: number, k: number, chunck: Chunck): void {
        let m = DRAW_CHUNCK_MARGIN;
        for (let ii = 0; ii < this.w; ii++) {
            for (let jj = 0; jj < this.d; jj++) {
                for (let kk = 0; kk < this.h; kk++) {
                    chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk);
                    chunck.updateIsEmptyIsFull(k + this.pk + kk);
                }
            }
        }
    }
}

export class RawShapeSphere extends RawShape {
    constructor(public rX: number, public rY: number, public rZ: number, pi?: number, pj?: number, pk?: number) {
        super(pi, pj, pk);
    }

    public draw(block: BlockType, i: number, j: number, k: number, chunck: Chunck): void {
        let m = DRAW_CHUNCK_MARGIN;
        let tRx = this.rX + 0.8;
        let tRy = this.rY + 0.8;
        let tRz = this.rZ + 0.8;
        let rrX = tRx * tRx;
        let rrY = tRy * tRy;
        let rrZ = tRz * tRz;
        let minI = Math.floor(-tRx);
        let maxI = Math.ceil(tRx);
        let minJ = Math.floor(-tRz);
        let maxJ = Math.ceil(tRz);
        let minK = Math.floor(-tRy);
        let maxK = Math.ceil(tRy);
        for (let ii = minI; ii < maxI; ii++) {
            for (let jj = minJ; jj < maxJ; jj++) {
                for (let kk = minK; kk < maxK; kk++) {
                    let dd = (ii * ii) / rrX + (jj * jj) / rrZ + (kk * kk) / rrY;
                    if (dd <= 1) {
                        chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk);
                        chunck.updateIsEmptyIsFull(k + this.pk + kk);
                    }
                }
            }
        }
    }
}

export class RawShapeDot extends RawShape {
    public dots: IJK[] = [];
    public minI: number = 0;
    public maxI: number = 0;
    public minJ: number = 0;
    public maxJ: number = 0;
    public minK: number = 0;
    public maxK: number = 0;

    constructor(pi?: number, pj?: number, pk?: number) {
        super(pi, pj, pk);
    }

    public addDot(i: number, j: number, k: number): void {
        this.dots.push({ i: i, j: j, k: k });
        
        this.minI = Math.min(this.minI, i);
        this.maxI = Math.max(this.maxI, i);
        this.minJ = Math.min(this.minJ, j);
        this.maxJ = Math.max(this.maxJ, j);
        this.minK = Math.min(this.minK, k);
        this.maxK = Math.max(this.maxK, k);
    }

    public refreshMinMax(): void {
        this.minI = Infinity;
        this.maxI = - Infinity;
        this.minJ = Infinity;
        this.maxJ = - Infinity;
        this.minK = Infinity;
        this.maxK = - Infinity;

        this.dots.forEach((dot) => {
            this.minI = Math.min(this.minI, dot.i);
            this.maxI = Math.max(this.maxI, dot.i);
            this.minJ = Math.min(this.minJ, dot.j);
            this.maxJ = Math.max(this.maxJ, dot.j);
            this.minK = Math.min(this.minK, dot.k);
            this.maxK = Math.max(this.maxK, dot.k);
        });
    }

    public draw(block: BlockType, i: number, j: number, k: number, chunck: Chunck): void {
        let m = DRAW_CHUNCK_MARGIN;

        this.dots.forEach((dot) => {
            chunck.setRawDataSafe(block, i + this.pi + dot.i + m, j + this.pj + dot.j + m, k + this.pk + dot.k + m);
            chunck.updateIsEmptyIsFull(k + this.pk + dot.k);
        });
    }
}

export class RawShapeLine extends RawShape {
    constructor(public Ai: number = 1, public Aj: number = 1, public Ak: number = 1, public Bi: number = 1, public Bj: number = 1, public Bk: number = 1, pi?: number, pj?: number, pk?: number) {
        super(pi, pj, pk);
    }

    public draw(block: BlockType, i: number, j: number, k: number, chunck: Chunck): void {
        let m = DRAW_CHUNCK_MARGIN;
        let iDist = Math.abs(this.Ai - this.Bi);
        let jDist = Math.abs(this.Aj - this.Bj);
        let kDist = Math.abs(this.Ak - this.Bk);

        if (iDist >= jDist && iDist >= kDist) {
            if (this.Ai < this.Bi) {
                for (let ii = this.Ai; ii <= this.Bi; ii++) {
                    let f = (ii - this.Ai) / iDist;
                    let jj = Math.round((1 - f) * this.Aj + f * this.Bj);
                    let kk = Math.round((1 - f) * this.Ak + f * this.Bk);
                    chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk + m);
                    chunck.updateIsEmptyIsFull(k + this.pk + kk);
                }
            } else {
                for (let ii = this.Bi; ii <= this.Ai; ii++) {
                    let f = (ii - this.Bi) / iDist;
                    let jj = Math.round((1 - f) * this.Bj + f * this.Aj);
                    let kk = Math.round((1 - f) * this.Bk + f * this.Ak);
                    chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk + m);
                    chunck.updateIsEmptyIsFull(k + this.pk + kk);
                }
            }
        } else if (jDist >= iDist && jDist >= kDist) {
            if (this.Aj < this.Bj) {
                for (let jj = this.Aj; jj <= this.Bj; jj++) {
                    let f = (jj - this.Aj) / jDist;
                    let ii = Math.round((1 - f) * this.Ai + f * this.Bi);
                    let kk = Math.round((1 - f) * this.Ak + f * this.Bk);
                    chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk + m);
                    chunck.updateIsEmptyIsFull(k + this.pk + kk);
                }
            } else {
                for (let jj = this.Bj; jj <= this.Aj; jj++) {
                    let f = (jj - this.Bj) / jDist;
                    let ii = Math.round((1 - f) * this.Bi + f * this.Ai);
                    let kk = Math.round((1 - f) * this.Bk + f * this.Ak);
                    chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk + m);
                    chunck.updateIsEmptyIsFull(k + this.pk + kk);
                }
            }
        } else if (kDist >= iDist && kDist >= kDist) {
            if (this.Ak < this.Bk) {
                for (let kk = this.Ak; kk <= this.Bk; kk++) {
                    let f = (kk - this.Ak) / kDist;
                    let ii = Math.round((1 - f) * this.Ai + f * this.Bi);
                    let jj = Math.round((1 - f) * this.Aj + f * this.Bj);
                    chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk + m);
                    chunck.updateIsEmptyIsFull(k + this.pk + kk);
                }
            } else {
                for (let kk = this.Bk; kk <= this.Ak; kk++) {
                    let f = (kk - this.Bk) / kDist;
                    let ii = Math.round((1 - f) * this.Bi + f * this.Ai);
                    let jj = Math.round((1 - f) * this.Bj + f * this.Aj);
                    chunck.setRawDataSafe(block, i + this.pi + ii + m, j + this.pj + jj + m, k + this.pk + kk + m);
                    chunck.updateIsEmptyIsFull(k + this.pk + kk);
                }
            }
        }
    }
}
