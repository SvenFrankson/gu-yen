import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Terrain } from "../../Terrain";
import { Chunck, DRAW_CHUNCK_MARGIN } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
import { IsVeryFinite } from "../../../Number";
import { UniqueList } from "../../../UniqueList";

export class FatLine {

    public p0: Vector3;
    public p1: Vector3;
    public size: number = 0.8;

    constructor(public terrain: Terrain, p0?: Vector3, p1?: Vector3, size?: number) {
        if (p0) {
            this.p0 = p0;
        }
        else {
            this.p0 = Vector3.Zero();
        }
        if (p1) {
            this.p1 = p1;
        }
        else {
            this.p1 = Vector3.Zero();
        }
        if (IsVeryFinite(size)) {
            this.size = size as number;
        }
    }

    public draw(block: BlockType, saveToLocalStorage?: boolean, skipChunckRedraw?: boolean) {
        let affectedChuncks = new UniqueList<Chunck>();
        let chunck = this.terrain.getChunckAtPos(this.p0, 0);
        if (!chunck) {
            return affectedChuncks;
        }

        let dIJ = Math.ceil(this.size * 0.5 / chunck.blockSizeIJ_m);
        let dK = Math.ceil(this.size * 0.5 / chunck.blockSizeK_m);

        let ijk0 = chunck.getIJKAtPos(this.p0);
        let ijk1 = chunck.getIJKAtPos(this.p1);
        let i0 = Math.min(ijk0.i, ijk1.i) - dIJ;
        let i1 = Math.max(ijk0.i, ijk1.i) + dIJ;
        let j0 = Math.min(ijk0.j, ijk1.j) - dIJ;
        let j1 = Math.max(ijk0.j, ijk1.j) + dIJ;
        let k0 = Math.min(ijk0.k, ijk1.k) - dK;
        let k1 = Math.max(ijk0.k, ijk1.k) + dK;

        for (let i = i0; i <= i1; i++) {
            for (let j = j0; j <= j1; j++) {
                for (let k = k0; k <= k1; k++) {
                    let p = chunck.getPosAtIJK(i, j, k);
                    /*
                    if (Mummu.DistancePointSegment(p, this.p0, this.p1) < this.size * 0.5) {
                        let chuncks = chunck.setData(block, i, j, k, true);
                        chuncks.forEach(c => { affectedChuncks.push(c); });
                    }
                    */
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

    public drawRawData(block: BlockType, chunck: Chunck) {
        let m = DRAW_CHUNCK_MARGIN;

        let dIJ = Math.ceil(this.size * 0.5 * chunck.blockSizeIJ_m);
        let dK = Math.ceil(this.size * 0.5 * chunck.blockSizeK_m);

        let ijk0 = chunck.getIJKAtPos(this.p0);
        let ijk1 = chunck.getIJKAtPos(this.p1);
        let i0 = Math.min(ijk0.i, ijk1.i) - dIJ;
        let i1 = Math.max(ijk0.i, ijk1.i) + dIJ;
        let j0 = Math.min(ijk0.j, ijk1.j) - dIJ;
        let j1 = Math.max(ijk0.j, ijk1.j) + dIJ;
        let k0 = Math.min(ijk0.k, ijk1.k) - dK;
        let k1 = Math.max(ijk0.k, ijk1.k) + dK;

        for (let i = i0; i <= i1; i++) {
            for (let j = j0; j <= j1; j++) {
                for (let k = k0; k <= k1; k++) {
                    let p = chunck.getPosAtIJK(i, j, k);
                    /*
                    if (Mummu.DistancePointSegment(p, this.p0, this.p1) < this.size * 0.5) {
                        chunck.setRawDataSafe(block, i + m, j + m, k + m);
                    }
                    */
                }
            }
        }
    }
}
