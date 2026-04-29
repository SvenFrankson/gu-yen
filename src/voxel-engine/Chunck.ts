import { Engine } from "@babylonjs/core/Engines/engine";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ChunckAnalytic, IChunckAnalyticBuildOccurence } from "./ChunckAnalytic";
import { Terrain } from "./Terrain";
import { BlockType } from "./BlockType";
import { IJK, Pow2 } from "../Number";
import { IActionAffectedBlocks } from "./TerrainEditor/TerrainEditor";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Compress, Decompress } from "../Compress";

export var DRAW_CHUNCK_MARGIN: number = 2;

export enum Fillness {
    Undefined,
    Mixed,
    Empty,
    Filled
}

enum AdjacentAxis {
    IPrev = 0,
    INext = 1,
    JPrev = 2,
    JNext = 3
}

export class Chunck {

    private _analytic?: ChunckAnalytic;
    public get analytic(): ChunckAnalytic {
        if (!this._analytic) {
            this._analytic = new ChunckAnalytic(this);
        }
        return this._analytic;
    }

    public name: string;
    public terrain: Terrain;

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

    public position: Vector3;
    public barycenter: Vector3;
    public readonly level: number = 0;
    public readonly isWorldEdge: boolean = false;
    public levelFactor: number = 0;
    public adjacents: (Chunck | undefined)[] = [];
    public children: Chunck[] = [];
    public parent?: Chunck;

    public getFillness(k: number): Fillness {
        if (k < 0) {
            return Fillness.Filled;
        }
        if (k >= this._dataSizeK) {
            return Fillness.Empty;
        }
        if (this._data[k].length === 1) {
            if (this._data[k][0] <= BlockType.Water) {
                return Fillness.Empty;
            }
            else {
                return Fillness.Filled;
            }
        }
        return Fillness.Mixed;
    }
    private _filledSide: number = 0b0;
    public get filledSide(): number {
        return this._filledSide;
    }
    private _dataInitialized: boolean = false;
    public get dataInitialized(): boolean {
        return this._dataInitialized;
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

    public _data: Uint8Array[] = [];

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

    public mesh: Mesh | undefined;
    public shellMesh: Mesh | undefined;

    private _registered: boolean = false;
    public get registered(): boolean {
        return this._registered;
    }

    private _subdivided: boolean = false;
    public get subdivided(): boolean {
        return this._subdivided;
    }

    constructor(iPos: number, jPos: number, parent: Chunck);
    constructor(iPos: number, jPos: number, terrain: Terrain);
    constructor(
        public iPos: number = 0,
        public jPos: number = 0,
        arg1: Chunck | Terrain
    ) {
        if (arg1 instanceof Terrain) {
            this.terrain = arg1;
        }
        else {
            this.parent = arg1;
            this.terrain = this.parent.terrain;
        }

        if (this.parent) {
            this.level = this.parent.level - 1;
            this.levelFactor = this.parent.levelFactor / 2;
        }
        else {
            this.level = this.terrain.maxLevel;
            this.levelFactor = Pow2(this.level);
        }

        this.name = "chunck:" + this.level + ":" + this.iPos + "-" + this.jPos;

        this.position = new Vector3(
            (this.iPos * this.chunckSizeIJ_m) * this.levelFactor - this.terrain.halfTerrainSizeIJ_m,
            0,
            (this.jPos * this.chunckSizeIJ_m) * this.levelFactor - this.terrain.halfTerrainSizeIJ_m
        );
        this.barycenter = new Vector3(
            ((this.iPos + 0.5) * this.chunckSizeIJ_m) * this.levelFactor - this.terrain.halfTerrainSizeIJ_m,
            0,
            ((this.jPos + 0.5) * this.chunckSizeIJ_m) * this.levelFactor - this.terrain.halfTerrainSizeIJ_m
        );
        this.barycenter.y = Math.min(this.barycenter.y, this.terrain.terrainSizeK_m);

        if (this.iPos === 0 || this.jPos === 0 || this.iPos === this.terrain.chunckCountIJ - 1 || this.jPos === this.terrain.chunckCountIJ - 1) {
            this.isWorldEdge = true;
        }
        
        this._dataSizeIJ = 2 * DRAW_CHUNCK_MARGIN + this.chunckLengthIJ;
        this._dataSizeK = this.chunckLengthK;
        this._dataSizeSquare = this._dataSizeIJ * this._dataSizeIJ;
    }

    public dispose(): void {
        this.collapseChildren();
        this.disposeMesh();
    }

    public getChuncksAround(dist: number): Chunck[] {
        let chuncksAround: Chunck[] = [];
        for (let I = - dist; I <= dist; I++) {
            for (let J = - dist; J <= dist; J++) {
                let chunck = this.terrain.getChunck(this.level, this.iPos + I, this.jPos + J);
                if (chunck) {
                    chuncksAround.push(chunck);
                }
            }
        }
        return chuncksAround;
    }

    public findAdjacents(): void {
        let iPrevChunck = this.terrain.getChunck(this.level, this.iPos - 1, this.jPos);
        if (iPrevChunck) {
            this.adjacents[AdjacentAxis.IPrev] = iPrevChunck;
            iPrevChunck.adjacents[AdjacentAxis.INext] = this;
        }
        let iNextChunck = this.terrain.getChunck(this.level, this.iPos + 1, this.jPos);
        if (iNextChunck) {
            this.adjacents[AdjacentAxis.INext] = iNextChunck;
            iNextChunck.adjacents[AdjacentAxis.IPrev] = this;
        }
        let jPrevChunck = this.terrain.getChunck(this.level, this.iPos, this.jPos - 1);
        if (jPrevChunck) {
            this.adjacents[AdjacentAxis.JPrev] = jPrevChunck;
            jPrevChunck.adjacents[AdjacentAxis.JNext] = this;
        }
        let jNextChunck = this.terrain.getChunck(this.level, this.iPos, this.jPos + 1);
        if (jNextChunck) {
            this.adjacents[AdjacentAxis.JNext] = jNextChunck;
            jNextChunck.adjacents[AdjacentAxis.JPrev] = this;
        }
    }

    public setAdjacent(other: Chunck): void {
        if (other.level === this.level) {
            if (other.iPos === this.iPos - 1) {
                this.adjacents[AdjacentAxis.IPrev] = other;
                other.adjacents[AdjacentAxis.INext] = this;
            }
            else if (other.iPos === this.iPos + 1) {
                this.adjacents[AdjacentAxis.INext] = other;
                other.adjacents[AdjacentAxis.IPrev] = this;
            }
            else if (other.jPos === this.jPos - 1) {
                this.adjacents[AdjacentAxis.JPrev] = other;
                other.adjacents[AdjacentAxis.JNext] = this;
            }
            else if (other.jPos === this.jPos + 1) {
                this.adjacents[AdjacentAxis.JNext] = other;
                other.adjacents[AdjacentAxis.JPrev] = this;
            }
        }
    }

    public removeFromAdjacents(): void {
        for (let index = 0; index < 6; index++) {
            let other = this.adjacents[index];
            if (other) {
                this.adjacents[index] = undefined;
                if (index % 2 === 0) {
                    other.adjacents[index + 1] = undefined;
                }
                else {
                    other.adjacents[index - 1] = undefined;
                }
            }
        }
    }

    public async initializeData(): Promise<void> {        
        if (!this.dataInitialized) {
            this._data = [];
            for (let k = 0; k < this._dataSizeK; k++) {
                this._data[k] = new Uint8Array(1);
                this._data[k][0] = BlockType.None;
            }

            let fromSave = false;
            fromSave = await this.terrain.chunckDataGeneratorSave.initializeData(this);
            if (!fromSave) {
                await this.terrain.chunckDataGenerator.initializeData(this);
                //await this.terrain.chunckDataGeneratorFlat.initializeData(this);
            }

            this._dataInitialized = true;
        }
    }

    public reset(): void {
        this._dataInitialized = false;
    }

    public getData(i: number, j: number, k: number): number {
        if (k < 0) {
            return BlockType.None;
        }
        if (k >= this.dataSizeK) {
            return BlockType.None;
        }
        if (i < - DRAW_CHUNCK_MARGIN) {
            let chunck = this.terrain.root?.getChunck(this.level, this.iPos - 1, this.jPos);
            if (chunck && chunck.dataInitialized) {
                return chunck.getData(i + this.chunckLengthIJ, j, k);
            }
            return BlockType.None;
        }
        if (i >= this.chunckLengthIJ + DRAW_CHUNCK_MARGIN) {
            let chunck = this.terrain.root?.getChunck(this.level, this.iPos + 1, this.jPos);
            if (chunck && chunck.dataInitialized) {
                return chunck.getData(i - this.chunckLengthIJ, j, k);
            }
            return BlockType.None;
        }
        if (j < - DRAW_CHUNCK_MARGIN) {
            let chunck = this.terrain.root?.getChunck(this.level, this.iPos, this.jPos - 1);
            if (chunck && chunck.dataInitialized) {
                return chunck.getData(i, j + this.chunckLengthIJ, k);
            }
            return BlockType.None;
        }
        if (j >= this.chunckLengthIJ + DRAW_CHUNCK_MARGIN) {
            let chunck = this.terrain.root?.getChunck(this.level, this.iPos, this.jPos + 1);
            if (chunck && chunck.dataInitialized) {
                return chunck.getData(i, j - this.chunckLengthIJ, k);
            }
            return BlockType.None;
        }
        if (this._data[k].length === 1) {
            return this._data[k][0];
        }
        return this._data[k][(i + DRAW_CHUNCK_MARGIN) + (j + DRAW_CHUNCK_MARGIN) * this._dataSizeIJ];
    }
    public setData(v: number, i: number, j: number, k: number, skipUpdateIsEmptyIsFull?: boolean, affectedBlocks?: IActionAffectedBlocks): Chunck[] {
        if (this.isWorldEdge && this.terrain.finiteEdges) {
            if (this.iPos === 0 && i <= 0) {
                return [];
            }
            if (this.iPos === this.terrain.chunckCountIJ - 1 && i >= this.chunckLengthIJ) {
                return [];
            }
            if (this.jPos === 0 && j <= 0) {
                return [];
            }
            if (this.jPos === this.terrain.chunckCountIJ - 1 && j >= this.chunckLengthIJ) {
                return [];
            }
        }
        if (i < 0) {
            let chunck = this.terrain.getChunck(this.level, this.iPos - 1, this.jPos);
            if (chunck) {
                return chunck.setData(v, i + this.chunckLengthIJ, j, k, skipUpdateIsEmptyIsFull, affectedBlocks);
            }
            return [];
        }
        if (i >= this.chunckLengthIJ) {
            let chunck = this.terrain.getChunck(this.level, this.iPos + 1, this.jPos);
            if (chunck) {
                return chunck.setData(v, i - this.chunckLengthIJ, j, k, skipUpdateIsEmptyIsFull, affectedBlocks);
            }
            return [];
        }
        if (j < 0) {
            let chunck = this.terrain.getChunck(this.level, this.iPos, this.jPos - 1);
            if (chunck) {
                return chunck.setData(v, i, j + this.chunckLengthIJ, k, skipUpdateIsEmptyIsFull, affectedBlocks);
            }
            return [];
        }
        if (j >= this.chunckLengthIJ) {
            let chunck = this.terrain.getChunck(this.level, this.iPos, this.jPos + 1);
            if (chunck) {
                return chunck.setData(v, i, j - this.chunckLengthIJ, k, skipUpdateIsEmptyIsFull, affectedBlocks);
            }
            return [];
        }
        if (k < 0) {
            return [];
        }
        if (k >= this.chunckLengthK - 1) {
            return [];
        }
        let m = DRAW_CHUNCK_MARGIN;
        let affectedChuncks: Chunck[] = [];
        let iPos0 = 0;
        let iPos1 = 0;
        let jPos0 = 0;
        let jPos1 = 0;
        if (i < m) {
            iPos0 = - 1;
        }
        if (j < m) {
            jPos0 = - 1;
        }
        if (i >= this.chunckLengthIJ - m) {
            iPos1 = 1;
        }
        if (j >= this.chunckLengthIJ - m) {
            jPos1 = 1;
        }
        for (let I = iPos0; I <= iPos1; I++) {
            for (let J = jPos0; J <= jPos1; J++) {
                let chunck = this.terrain.getChunck(this.level, this.iPos + I, this.jPos + J);
                if (chunck) {
                    if (chunck.setRawDataSafe(v, (i - I * this.chunckLengthIJ + m), (j - J * this.chunckLengthIJ + m), k)) {
                        affectedChuncks.push(chunck);
                        if (affectedBlocks) {
                            let existing = affectedBlocks.rawBlocks?.get(this);
                            if (!existing) {
                                existing = [];
                                affectedBlocks.rawBlocks?.set(this, existing);
                            }
                            existing.push({ i: i - I * this.chunckLengthIJ + m, j: j - J * this.chunckLengthIJ + m, k: k });
                        }
                    }
                }
            }
        }

        if (!skipUpdateIsEmptyIsFull) {
            affectedChuncks.forEach(c => {
                c.updateIsEmptyIsFull(k);
            });
        }
        
        return affectedChuncks;
    }

    public updateIsEmptyIsFull(k: number): void {
        if (k < 0 || k >= this._dataSizeK) {
            return;
        }
        if (this._data[k].length === 1) {
            return;
        }
        let m = DRAW_CHUNCK_MARGIN;

        let firstBlock = this._data[k][0];
        for (let i = 0; i <= this.chunckLengthIJ; i++) {
            for (let j = 0; j <= this.chunckLengthIJ; j++) {
                let block = this.getRawData(i + m, j + m, k);
                if (block != firstBlock) {
                    return;
                }
            }
        }
        this._data[k] = new Uint8Array([firstBlock]);
    }

    public getChunck(level: number, iPos: number, jPos: number): Chunck | undefined {
        if (this.level === level) {
            return this;
        }
        else {
            let f = Pow2(this.level - level);
            let i = Math.floor((iPos - f * this.iPos) / (f / 2));
            let j = Math.floor((jPos - f * this.jPos) / (f / 2));
            if (i < 0 || j < 0 || i >= 2 || j >= 2) {
                return undefined;
            }
            let child = this.children[j + 2 * i];
            if (child instanceof Chunck) {
                return child.getChunck(level, iPos, jPos);
            }
        }
        return undefined;
    }

    public getDescendants(level: number, descendants?: Chunck[]): Chunck[] {
        if (!descendants) {
            descendants = [];
        }

        if (this.level === level + 1 && this.children && this.children.length > 0) {
            descendants.push(...this.children);
        }
        else {
            for (let i = 0; i < this.children.length; i++) {
                this.children[i]?.getDescendants(level, descendants);
            }
        }

        return descendants;
    }

    public getParent(level: number): Chunck | undefined {
        if (this.level >= level) {
            return this;
        }
        return this.parent?.getParent(level);
    }

    public getIJKAtPos(pos: Vector3): IJK {
        let i = Math.floor((pos.x - this.position.x) / this.blockSizeIJ_m);
        let j = Math.floor((pos.z - this.position.z) / this.blockSizeIJ_m);
        let k = Math.floor((pos.y - this.position.y) / this.blockSizeK_m);
        return { i: i, j: j, k: k };
    }

    public getPosAtIJK(ijk: IJK): Vector3;
    public getPosAtIJK(i: number, j: number, k: number): Vector3;
    public getPosAtIJK(a: number | IJK, j?: number, k?: number): Vector3 {
        let i: number;
        if (typeof(a) === "number") {
            i = a;
        }
        else {
            i = a.i;
            j = a.j;
            k = a.k;
        }
        let v = Vector3.Zero();
        if (j === undefined || k === undefined) {
            return v;
        }
        let x = (i + 0.5) * this.blockSizeIJ_m + this.position.x;
        let z = (j + 0.5) * this.blockSizeIJ_m + this.position.z;
        let y = (k + 0.5) * this.blockSizeK_m + this.position.y;
        v.set(x, y, z);
        return v;
    }

    public getEvenIJKAtPos(pos: Vector3): IJK {
        let i = Math.round((pos.x - this.position.x) / this.blockSizeIJ_m);
        let j = Math.round((pos.z - this.position.z) / this.blockSizeIJ_m);
        let k = Math.round((pos.y - this.position.y) / this.blockSizeK_m);
        return { i: i, j: j, k: k };
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
        let i = Math.floor(iGlobal / this.levelFactor) - this.chunckLengthIJ * this.iPos;
        let j = Math.floor(jGlobal / this.levelFactor) - this.chunckLengthIJ * this.jPos;
        let k = Math.floor(kGlobal / this.levelFactor);
        
        return { i: i, j: j, k: k };
    }

    public IJKLocalToWorldPosToRef(iLocal: number, jLocal: number, kLocal: number, refV: Vector3): Vector3;
    public IJKLocalToWorldPosToRef(ijkLocal: IJK, refV: Vector3): Vector3;
    public IJKLocalToWorldPosToRef(a: number | IJK, b?: number | Vector3, kLocal?: number, refV?: Vector3): Vector3 {
        let iLocal: number = 0;
        let jLocal: number = 0;
        if (typeof(a) === "number") {
            iLocal = a;
            if (typeof(b) === "number") {
                jLocal = b;
            }
        }
        else {
            iLocal = a.i;
            jLocal = a.j;
            kLocal = a.k;
            if (b instanceof Vector3) {
                refV = b;
            }
        }
        
        if (!refV) {
            refV = Vector3.Zero();
        }
        if (kLocal === undefined) {
            return refV;
        }
        
        refV.x = (iLocal + 0.5) * this.terrain.blockSizeIJ_m;
        refV.y = (kLocal + 0.5) * this.terrain.blockSizeK_m;
        refV.z = (jLocal + 0.5) * this.terrain.blockSizeIJ_m;
        refV.addInPlace(this.position);

        return refV;
    }

    public register(): void {
        if (!this.registered && this.level > 0) {
            this._registered = true;
            this.terrain.chunckManager.registerChunck(this);
        }
    }

    public unregister(): void {
        if (this.registered) {
            this._registered = false;
            this.terrain.chunckManager.unregisterChunck(this);
        }
    }

    private _originX?: Mesh;
    private _originY?: Mesh;
    private _originZ?: Mesh;
    public highlight(): void {
        if (this.mesh) {
            this.mesh.material = this.terrain.highlightMaterial;
        }
        
        this._originX = MeshBuilder.CreateBox("originX", { width: 100, height: 0.2, depth: 0.2 });
        this._originX?.position.copyFrom(this.position);

        this._originY = MeshBuilder.CreateBox("originY", { width: 0.2, height: 100, depth: 0.2 });
        this._originY?.position.copyFrom(this.position);

        this._originZ = MeshBuilder.CreateBox("originZ", { width: 0.2, height: 0.2, depth: 100 });
        this._originZ?.position.copyFrom(this.position);
    }

    public unlit(): void {
        if (this.mesh) {
            this.mesh.material = this.terrain.getMaterial(this.level);
        }
        if (this._originX) {
            this._originX.dispose();
        }
        if (this._originY) {
            this._originY.dispose();
        }
        if (this._originZ) {
            this._originZ.dispose();
        }
    }

    public async redrawMesh(force?: boolean): Promise<void> {
        if (!this.subdivided) {
            if (this.level <= this.terrain.maxDisplayedLevel) {
                let t0: number = 0;
                let analyticOccurence: IChunckAnalyticBuildOccurence | undefined = undefined;
                if (this.terrain.useAnalytics) {
                    t0 = performance.now();
                    analyticOccurence = { 
                        firstNonEmptyReferenceK: 0,
                        lastNonEmptyReferenceK: 0
                    }
                }
                if (!this._dataInitialized) {
                    await this.initializeData();
                }
                let sides = 0b0;
                for (let i = 0; i < 6; i++) {
                    let adj = this.adjacents[i];
                    if (adj && adj.level === this.level && adj.subdivided) {
                        sides |= 0b1 << i;
                    }
                }

                if (force || !this.mesh || sides != this._lastDrawnSides) {
                    let vertexData = this.terrain.chunckBuilder.BuildMesh(this, sides, analyticOccurence);
                    if (vertexData) {
                        if (!this.mesh) {
                            this.mesh = new Mesh(this.name + "-mesh");
                        }
                        vertexData.applyToMesh(this.mesh);
                        this.mesh.position.copyFrom(this.position);

                        if (this.terrain.customChunckMaterialSet) {
                            this.terrain.customChunckMaterialSet(this);
                        }
                        else {
                            this.mesh.material = this.terrain.getMaterial(this.level);
                        }
                        //this.mesh.material = this.terrain.testMaterials[this.level];
                        this.mesh.freezeWorldMatrix();
                    }
                    else {
                        console.warn("ChunckMeshBuilder failed");
                    }
                    this._lastDrawnSides = sides;
                    if (this.terrain.useAnalytics && analyticOccurence && vertexData.positions) {
                        let t1 = performance.now();
                        let dt = t1 - t0;
                        analyticOccurence.duration = dt;
                        analyticOccurence.triangleCount = vertexData.positions.length / 3;
                        this.analytic.addBuildOccurence(analyticOccurence);
                    }
                }
            }
        }
    }

    private _lastDrawnSides: number = 0b0;

    public disposeMesh(): void {
        if (this.mesh) {
            this.mesh.dispose();
        }
        this.mesh = undefined;
        this.terrain.scene.onBeforeRenderObservable.removeCallback(this.updateGlobalLight3DTexture);
        this._updatingGlobalLight = false;
    }

    public startGlobalLight3DTextureComputation(): void {
        this.terrain.scene.onBeforeRenderObservable.removeCallback(this.updateGlobalLight3DTexture);
        this._currentGlobalLightK = this.dataSizeK - 1;
        this._updatingGlobalLight = true;
        this.terrain.scene.onBeforeRenderObservable.add(this.updateGlobalLight3DTexture);
    }

    private _updatingGlobalLight: boolean = false;
    public get updatingGlobalLight(): boolean {
        return this._updatingGlobalLight;
    }
    private _currentGlobalLightK: number = -1;
    private _currentGlobalLightData: Uint8ClampedArray | undefined;
    private updateGlobalLight3DTexture = () => {
        if (!this.mesh) {
            // Kill switch, in case mesh has been deleted, do not go through this.
            this.terrain.scene.onBeforeRenderObservable.removeCallback(this.updateGlobalLight3DTexture);
            this._updatingGlobalLight = false;
            return;
        }

        let width = this.terrain.chunckLengthIJ + 2;
        let height = this.terrain.chunckLengthK;
        let depth = this.terrain.chunckLengthIJ + 2;

        let di = this.terrain.sunDir.x;
        let dj = this.terrain.sunDir.z;
        let dk = this.terrain.sunDir.y;

        let max = Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk));
        di /= max;
        dj /= max;
        dk /= max;

        let stepCount: number = 60;
        let tests: Vector3[] = []
        let raySequence: number[] = [0, 0, 0];
        if (this.terrain.sunDir.x != 0) {
            tests.push(new Vector3(Math.sign(this.terrain.sunDir.x), 0, 0));
            raySequence[0] = tests[0].x;
        }
        if (this.terrain.sunDir.y != 0) {
            tests.push(new Vector3(0, Math.sign(this.terrain.sunDir.y), 0));
            raySequence[1] = tests[1].y;
        }
        if (this.terrain.sunDir.z != 0) {
            tests.push(new Vector3(0, 0, Math.sign(this.terrain.sunDir.z)));
            raySequence[2] = tests[2].z;
        }
        let tmpV = Vector3.Zero();
        for (let n = 1; n < stepCount; n++) {
            let bestAngle = Infinity;
            for (let t = 0; t < tests.length; t++) {
                tmpV.x = raySequence[3 * (n - 1)];
                tmpV.y = raySequence[3 * (n - 1) + 1];
                tmpV.z = raySequence[3 * (n - 1) + 2];
                tmpV.addInPlace(tests[t]);

                //let a = Mummu.Angle(this.terrain.sunDir, tmpV);
                let a = 0;
                if (a < bestAngle) {
                    raySequence[3 * n] = tmpV.x;
                    raySequence[3 * n + 1] = tmpV.y;
                    raySequence[3 * n + 2] = tmpV.z;
                    bestAngle = a;
                }
            }
        }

        if (!this._currentGlobalLightData) {
            this._currentGlobalLightData = new Uint8ClampedArray(width * height * depth);
        }

        let t0 = performance.now();
        while (this._currentGlobalLightK >= 0) {
            let fillnessAbove = this.getFillness(this._currentGlobalLightK + 1);
            if (fillnessAbove === Fillness.Filled) {
                for (let i = 0; i < width; i++) {
                    for (let j = 0; j < depth; j++) {
                        if (this._currentGlobalLightData) {
                            this._currentGlobalLightData[(i + j * width + this._currentGlobalLightK * width * width)] = 0;
                        }
                    }
                }
            }
            let fillnessBelow = this.getFillness(this._currentGlobalLightK - 1);
            if (fillnessBelow === Fillness.Empty) {
                for (let i = 0; i < width; i++) {
                    for (let j = 0; j < depth; j++) {
                        if (this._currentGlobalLightData) {
                            this._currentGlobalLightData[(i + j * width + this._currentGlobalLightK * width * width)] = 255;
                        }
                    }
                }
            }
            else {
                for (let i = 0; i < width; i++) {
                    for (let j = 0; j < depth; j++) {
                        if (this._currentGlobalLightData) {
                            this._currentGlobalLightData[(i + j * width + this._currentGlobalLightK * width * width)] = 255;
                        }
                        for (let n = 0; n < stepCount; n++) {
                            let ii = raySequence[3 * n];
                            let jj = raySequence[3 * n + 2];
                            let kk = raySequence[3 * n + 1];
                            let I = i + ii;
                            let J = j + jj;
                            let K = Math.min(this._currentGlobalLightK + kk, this._dataSizeK - 1);
                            
                            let v = this.getData(I, J, K);
                            if (v > BlockType.Water) {
                                if (this._currentGlobalLightData) {
                                    this._currentGlobalLightData[(i + j * width + this._currentGlobalLightK * width * width)] = 0;
                                }
                                n = Infinity;
                            }
                            /*
                            else if (n > 5 && I >= 0 && J >= 0 && K >= 0 && I < width && J < depth && K < height && this._currentGlobalLightData[(I + J * width + K * width * width)] === 255) {
                                this._currentGlobalLightData[(i + j * width + this._currentGlobalLightK * width * width)] = 255;
                                n = Infinity;
                            }
                            */
                        }
                    }
                }
            }
            this._currentGlobalLightK--;
            if (performance.now() - t0 > 1) {
                return;
            }
        }

        /*
        for (let n = 0; n < 2; n++) {
            let clonedData = new Uint8ClampedArray(width * height * depth);
            for (let k = 0; k < height; k++) {
                for (let i = 0; i < width; i++) {
                    for (let j = 0; j < depth; j++) {
                        let v = this._currentGlobalLightData[(i + j * width + k * width * width)];
                        let c = 1;

                        if (i > 0) {
                            v += this._currentGlobalLightData[((i - 1) + j * width + k * width * width)];
                            c++;
                        }
                        if (i < width - 1) {
                            v += this._currentGlobalLightData[((i + 1) + j * width + k * width * width)];
                            c++;
                        }

                        if (j > 0) {
                            v += this._currentGlobalLightData[(i + (j - 1) * width + k * width * width)];
                            c++;
                        }
                        if (j < width - 1) {
                            v += this._currentGlobalLightData[(i + (j + 1) * width + k * width * width)];
                            c++;
                        }

                        if (k > 0) {
                            //v += this._currentGlobalLightData[(i + j * width + (k - 1) * width * width)];
                            //c++;
                        }
                        if (k < height - 1) {
                            v += this._currentGlobalLightData[(i + j * width + (k + 1) * width * width)];
                            c++;
                        }

                        clonedData[(i + j * width + k * width * width)] = v / c;
                    }
                }
            }
            this._currentGlobalLightData = clonedData;
        }
        */
        
        /*
        let globalLight3DTexture = new RawTexture3D(this._currentGlobalLightData, width, depth, height, Constants.TEXTUREFORMAT_R, this.mesh._scene, false, false, Texture.TRILINEAR_SAMPLINGMODE, Engine.TEXTURETYPE_UNSIGNED_BYTE);
        globalLight3DTexture.wrapU = 1;
        globalLight3DTexture.wrapV = 1;
        globalLight3DTexture.wrapR = 1;

        if (this.mesh && this.mesh.material instanceof ShaderMaterial) {
            this.mesh.material.setTexture("lightTexture", globalLight3DTexture);
        }

        this._updatingGlobalLight = false;
        */
        this.terrain.scene.onBeforeRenderObservable.removeCallback(this.updateGlobalLight3DTexture);
    }

    public subdivide(): Chunck[] | undefined {
        if (this._subdivided) {
            return;
        }
        this._subdivided = true;

        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                let chunck = this.children[j + 2 * i];
                if (!chunck) {
                    chunck = new Chunck(this.iPos * 2 + i, this.jPos * 2 + j, this);
                    this.children[j + 2 * i] = chunck;
                }
                if (chunck.level > 0) {
                    chunck.register();
                }
                chunck.findAdjacents();
            }
        }
        if (this.level > 1) {
            //this.unregister();
        }
        this.disposeMesh();
        return this.children;
    }

    public canCollapse(): boolean {
        if (this.parent) {
            if (!this.parent.subdivided) {
                console.error("oupsy " + this.children.length);
            }
            //let siblings = this.parent.children;
            //for (let i = 0; i < siblings.length; i++) {
            //    let sib = siblings[i];
            //    if (sib.subdivided) {
            //        return false;
            //    }
            //}
            return true;
        }
        return false;
    }

    public collapse(): Chunck {
        if (this.parent && this.canCollapse()) {
            return this.parent.collapseChildren();
        }
        return this;
    }

    public collapseChildren(): Chunck {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            if (child.children.length > 0) {
                child.collapseChildren();
            }
            child.unregister();
            child.disposeMesh();
            child.removeFromAdjacents();
        }
        this.register();
        this.children = [];
        this._subdivided = false;
        this.findAdjacents();
        return this;
    }

    public saveToLocalStorage(): void {
        let dataString = this.serializeData2();
        localStorage.setItem(this.name, dataString);
    }

    public serializeData(): string {
        let compressedDataArray: number[][] = [];
        for (let k = 0; k < this._dataSizeK; k++) {
            let compressedData = [...this._data[k]];
            compressedDataArray[k] = compressedData;
        }
        return JSON.stringify(compressedDataArray);
    }

    public serializeData2(): string {
        let dataString: string = "";

        for (let k = 0; k < this._dataSizeK; k++) {
            let l = this._data[k].length;
            if (l === 1) {
                dataString += "O" + this._data[k][0].toString(16).padStart(2, "0");
            }
            else {
                let layerDataString = "";
                let compressedData = Compress(this._data[k]);
                for (let i = 0; i < compressedData.length; i++) {
                    layerDataString += compressedData[i].toString(16).padStart(2, "0");
                }
                dataString += "M" + layerDataString;
            }
        }

        return dataString;
    }

    public deserializeData2(dataString: string): void {
        let splitDataString = dataString.split(/[XOM]+/).filter((s) => { return s.length > 0; });
        let kMax = Math.min(splitDataString.length, this.dataSizeK);
        for (let k = 0; k < kMax; k++) {
            let layerDataString = splitDataString[k];
            if (layerDataString.length === 2) {
                this._data[k] = new Uint8Array([parseInt(layerDataString, 16)]);
            }
            else {
                let compressedLayerData: Uint8Array = new Uint8Array(layerDataString.length / 2);
                for (let n = 0; n < layerDataString.length / 2; n++) {
                    compressedLayerData[n] = parseInt(layerDataString.substring(2 * n, 2 * n + 2), 16);
                }
                this._data[k] = Decompress(compressedLayerData);
            }
            this.updateIsEmptyIsFull(k);
        }
    }
}
