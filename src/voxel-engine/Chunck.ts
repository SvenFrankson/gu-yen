import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { CHUNCK_HEIGHT, CHUNCK_SIZE } from "../Globals";

export class Chunck {

    public mesh: Mesh | null = null;
    public blocks: (number | number[])[] = [];
    
    constructor(public i: number, public j: number, public k: number = 0) {
        for (let k = 0; k < CHUNCK_HEIGHT; k++) {
            this.blocks[k] = 0;
        }
    }

    public getBlock(localI: number, localJ: number, localK: number): number {
        let layer = this.blocks[localK];
        if (typeof layer === "number") {
            return layer;
        }
        return layer[localJ * CHUNCK_SIZE + localI];
    }

    public setBlock(block: number, localI: number, localJ: number, localK: number, useCollapseCheck: boolean = false) {
        let layer = this.blocks[localK];

        if (typeof layer === "number") {
            if (layer === block) {
                return;
            }
            layer = new Array(CHUNCK_SIZE * CHUNCK_SIZE).fill(layer);
            layer[localJ * CHUNCK_SIZE + localI] = block;
            this.blocks[localK] = layer;
            return;
        }
        else {
            layer[localJ * CHUNCK_SIZE + localI] = block;
            if (useCollapseCheck) {
                this.collapseStep(localK);
            }
        }
    }

    public collapseStep(localK: number): void {
        let layer = this.blocks[localK];
        if (typeof layer !== "number") {
            let block0 = layer[0];
            for (let i = 1; i < CHUNCK_SIZE * CHUNCK_SIZE; i++) {
                if (layer[i] !== block0) {
                    return;
                }
            }
            this.blocks[localK] = block0;
        }
    }
}