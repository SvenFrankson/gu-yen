import { Shape } from "../Shape";
import { Terrain } from "../../Terrain";
import { Chunck } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
export interface ILineProps {}

export class Line extends Shape {
    constructor(terrain: Terrain, public props?: ILineProps) {
        super(terrain);
        if (!this.props) {
            this.props = {};
        }
    }

    public draw(chunck: Chunck, ijk0: IJK, ijk1: IJK, blockType: BlockType, mode: TerrainEditionMode, saveToLocalStorage?: boolean, skipChunckRedraw?: boolean) {
        let affectedChuncks = new UniqueList<Chunck>();

        let iDist = Math.abs(ijk0.i - ijk1.i);
        let jDist = Math.abs(ijk0.j - ijk1.j);
        let kDist = Math.abs(ijk0.k - ijk1.k);

        if (iDist === 0 && jDist === 0 && kDist === 0) {
            chunck.setData(blockType, ijk0.i, ijk0.j, ijk0.k);
        }
        else if (iDist >= jDist && iDist >= kDist) {
            if (ijk0.i < ijk1.i) {
                for (let ii = ijk0.i; ii <= ijk1.i; ii++) {
                    let f = (ii - ijk0.i) / iDist;
                    let jj = Math.round((1 - f) * ijk0.j + f * ijk1.j);
                    let kk = Math.round((1 - f) * ijk0.k + f * ijk1.k);
                    let chuncks = chunck.setData(blockType, ii, jj, kk);
                    chuncks.forEach((c) => {
                        affectedChuncks.push(c);
                    });
                }
            } else {
                for (let ii = ijk1.i; ii <= ijk0.i; ii++) {
                    let f = (ii - ijk1.i) / iDist;
                    let jj = Math.round((1 - f) * ijk1.j + f * ijk0.j);
                    let kk = Math.round((1 - f) * ijk1.k + f * ijk0.k);
                    let chuncks = chunck.setData(blockType, ii, jj, kk);
                    chuncks.forEach((c) => {
                        affectedChuncks.push(c);
                    });
                }
            }
        }
        else if (jDist >= iDist && jDist >= kDist) {
            if (ijk0.j < ijk1.j) {
                for (let jj = ijk0.j; jj <= ijk1.j; jj++) {
                    let f = (jj - ijk0.j) / jDist;
                    let ii = Math.round((1 - f) * ijk0.i + f * ijk1.i);
                    let kk = Math.round((1 - f) * ijk0.k + f * ijk1.k);
                    let chuncks = chunck.setData(blockType, ii, jj, kk);
                    chuncks.forEach((c) => {
                        affectedChuncks.push(c);
                    });
                }
            } else {
                for (let jj = ijk1.j; jj <= ijk0.j; jj++) {
                    let f = (jj - ijk1.j) / jDist;
                    let ii = Math.round((1 - f) * ijk1.i + f * ijk0.i);
                    let kk = Math.round((1 - f) * ijk1.k + f * ijk0.k);
                    let chuncks = chunck.setData(blockType, ii, jj, kk);
                    chuncks.forEach((c) => {
                        affectedChuncks.push(c);
                    });
                }
            }
        }
        else if (kDist >= iDist && kDist >= kDist) {
            if (ijk0.k < ijk1.k) {
                for (let kk = ijk0.k; kk <= ijk1.k; kk++) {
                    let f = (kk - ijk0.k) / kDist;
                    let ii = Math.round((1 - f) * ijk0.i + f * ijk1.i);
                    let jj = Math.round((1 - f) * ijk0.j + f * ijk1.j);
                    let chuncks = chunck.setData(blockType, ii, jj, kk);
                    chuncks.forEach((c) => {
                        affectedChuncks.push(c);
                    });
                }
            } else {
                for (let kk = ijk1.k; kk <= ijk0.k; kk++) {
                    let f = (kk - ijk1.k) / kDist;
                    let ii = Math.round((1 - f) * ijk1.i + f * ijk0.i);
                    let jj = Math.round((1 - f) * ijk1.j + f * ijk0.j);
                    let chuncks = chunck.setData(blockType, ii, jj, kk);
                    chuncks.forEach((c) => {
                        affectedChuncks.push(c);
                    });
                }
            }
        }

        if (!skipChunckRedraw) {
            for (let i = 0; i < affectedChuncks.length; i++) {
                let chunck = affectedChuncks.get(i);
                for (let k = Math.min(ijk0.k, ijk1.k); k <= Math.max(ijk0.k, ijk1.k); k++) {
                    chunck.updateIsEmptyIsFull(ijk0.k + k);
                }
                chunck.redrawMesh(true);
                if (saveToLocalStorage) {
                    chunck.saveToLocalStorage();
                }
                this.terrain.save.saveChunck(chunck);
            }
        }

        return affectedChuncks;
    }
}
