import { IJK, IsVeryFinite, MinMax } from "../../Number";
import { UniqueList } from "../../UniqueList";
import { BlockType } from "../BlockType";
import { Chunck } from "../Chunck";
import { Terrain } from "../Terrain";

export enum TerrainEditionMode {
    None,
    Add,
    AddIfEmpty,
    Erase,
    Fatten,
    Shrink,
    Smooth,
    Test
}

export enum BrushShape {
    Disc,
    Square,
    Sphere,
    Cube
}

export interface IActionProperties {
    mode?: TerrainEditionMode;
    brushSize?: number;
    noiseValue?: number;
    brushBlock?: number;
    brushShape?: BrushShape;
    saveToLocalStorage?: boolean;
    skipRedraw?: boolean;
}

export interface IActionAffectedBlocks {
    rawBlocks?: Map<Chunck, IJK[]>
}

export class TerrainEditor {

    public static adjIndexes = [
        { i: 1, j: 0, k: 0},
        { i: - 1, j: 0, k: 0},
        { i: 0, j: 1, k: 0},
        { i: 0, j: - 1, k: 0},
        { i: 0, j: 0, k: 1},
        { i: 0, j: 0, k: - 1}
    ];
    
    public static adjIndexes2 = [
        { i: 1, j: 0, k: 0},
        { i: - 1, j: 0, k: 0},
        { i: 0, j: 1, k: 0},
        { i: 0, j: - 1, k: 0},
        { i: 0, j: 0, k: 1},
        { i: 0, j: 0, k: - 1},
        { i: 1, j: 1, k: 0},
        { i: 1, j: -1, k: 0},
        { i: -1, j: -1, k: 0},
        { i: -1, j: 1, k: 0},
        { i: 0, j: 1, k: 1},
        { i: 0, j: 1, k: -1},
        { i: 0, j: -1, k: -1},
        { i: 0, j: -1, k: 1},
        { i: 1, j: 0, k: 1},
        { i: -1, j: 0, k: 1},
        { i: -1, j: 0, k: -1},
        { i: 1, j: 0, k: -1},
    ];
    
    public static adjIndexes3 = [
        { i: -1, j: -1, k: -1},
        { i: 0, j: -1, k: -1},
        { i: 1, j: -1, k: -1},
        { i: -1, j: 0, k: -1},
        { i: 0, j: 0, k: -1},
        { i: 1, j: 0, k: -1},
        { i: -1, j: 1, k: -1},
        { i: 0, j: 1, k: -1},
        { i: 1, j: 1, k: -1},

        { i: -1, j: -1, k: 0},
        { i: 0, j: -1, k: 0},
        { i: 1, j: -1, k: 0},
        { i: -1, j: 0, k: 0},
        { i: 1, j: 0, k: 0},
        { i: -1, j: 1, k: 0},
        { i: 0, j: 1, k: 0},
        { i: 1, j: 1, k: 0},
        
        { i: -1, j: -1, k: 1},
        { i: 0, j: -1, k: 1},
        { i: 1, j: -1, k: 1},
        { i: -1, j: 0, k: 1},
        { i: 0, j: 0, k: 1},
        { i: 1, j: 0, k: 1},
        { i: -1, j: 1, k: 1},
        { i: 0, j: 1, k: 1},
        { i: 1, j: 1, k: 1},
    ];

    public addBrushBlock: BlockType = BlockType.None;
    public eraseBrushBlock: BlockType = BlockType.None;
    public get brushBlock(): BlockType {
        if (this.mode === TerrainEditionMode.Erase) {
            return this.eraseBrushBlock;
        }
        else {
            return this.addBrushBlock;
        }
    }
    public brushSize: number = 1;
    private _brushShape: BrushShape = BrushShape.Sphere;
    public get brushShape(): BrushShape {
        return this._brushShape;
    }
    public mode: TerrainEditionMode = TerrainEditionMode.Add;
    public noise: number = 0;
    public noiseValues: number[] = [1, 0.9, 0.75, 0.5, 0.25, 0.1];
    public get noiseValue(): number {
        return this.noiseValues[this.noise];
    }

    constructor(public terrain: Terrain) {

    }

    public setBrushSize(s: number): void {
        s = MinMax(s, 1, 20);
        this.brushSize = s;
        if (this.onBrushSizeChanged) {
            this.onBrushSizeChanged(this.brushSize);
        }
    }
    public onBrushSizeChanged: ((s: number) => void) | undefined;

    public setBrushShape(shape: BrushShape): void {
        this._brushShape = shape;
        if (this.onBrushShapeChanged) {
            this.onBrushShapeChanged(this._brushShape);
        }
    }
    public onBrushShapeChanged: ((shape: BrushShape) => void) | undefined;

    public setBrushBlock(b: number): void {
        if (this.mode === TerrainEditionMode.Erase) {
            this.setEraseBrushBlock(b);
        }
        else {
            this.setAddBrushBlock(b);
        }
    }
    public setAddBrushBlock(b: number): void {
        this.addBrushBlock = b;
        if (this.onBrushBlockChanged) {
            this.onBrushBlockChanged(this.addBrushBlock);
        }
    }
    public setEraseBrushBlock(b: number): void {
        this.eraseBrushBlock = b;
        if (this.onBrushBlockChanged) {
            this.onBrushBlockChanged(this.eraseBrushBlock);
        }
    }
    public onBrushBlockChanged: ((b: number) => void) | undefined;

    public setEditionMode(m: TerrainEditionMode): void {
        this.mode = m;
        if (this.onEditionModeChanged) {
            this.onEditionModeChanged(this.mode);
        }
    }
    public onEditionModeChanged: ((m: TerrainEditionMode) => void) | undefined;

    public setNoise(v: number): void {
        v = MinMax(v, 0, 5);
        this.noise = v;
        if (this.onNoiseChanged) {
            this.onNoiseChanged(this.noise);
        }
    }
    public onNoiseChanged: ((b: number) => void) | undefined;

    public doTest = () => {};

    public doAction(chunck: Chunck, ijk: IJK, props?: IActionProperties, affectedBlocks?: IActionAffectedBlocks): void {
        let affectedChuncks = new UniqueList<Chunck>();
        if (affectedBlocks && !affectedBlocks.rawBlocks) {
            affectedBlocks.rawBlocks = new Map<Chunck, IJK[]>();
        }

        if (!props) {
            props = {};
        }
        if (!IsVeryFinite(props.mode)) {
            props.mode = this.mode;
        }
        if (!IsVeryFinite(props.brushSize)) {
            props.brushSize = this.brushSize;
        }
        if (!IsVeryFinite(props.brushShape)) {
            props.brushShape = this.brushShape;
        }
        if (!IsVeryFinite(props.noiseValue)) {
            props.noiseValue = this.noiseValue;
        }
        if (!IsVeryFinite(props.brushBlock)) {
            props.brushBlock = this.mode === TerrainEditionMode.Erase ? this.eraseBrushBlock : this.addBrushBlock;
        }
        if (props.saveToLocalStorage === undefined) {
            props.saveToLocalStorage = this.terrain.useLocalStorage;
        }

        let first = - Math.floor(props.brushSize as number / 2);
        let last = Math.ceil(props.brushSize as number / 2);
        let kFirst = first;
        let kLast = last;
        if (props.brushShape === BrushShape.Disc || props.brushShape === BrushShape.Square) {
            kFirst = 0;
            kLast = 1;
        }
        let k0 = Infinity;
        let k1 = - Infinity;

        if (props.mode === TerrainEditionMode.Test) {
            if (this.doTest) {
                this.doTest();
            }
        }
        else if (props.mode === TerrainEditionMode.Fatten) {
            let todo = [];
            for (let i = first; i < last; i++) {
                for (let j = first; j < last; j++) {
                    for (let k = first; k < last; k++) {
                        let offset = props.brushSize as number % 2 === 0 ? 0.5 : 0;
                        let d = Math.sqrt((i + offset) * (i + offset) + (j + offset) * (j + offset) + (k + offset) * (k + offset));
                        if (d <= Math.ceil(props.brushSize as number / 2)) {
                            if (Math.random() < (props.noiseValue as number)) {
                                let block = chunck.getData(ijk.i + i, ijk.j + j, ijk.k + k);
                                if (block === BlockType.None) {
                                    let adjExists = false;
                                    for (let n = 0; n < TerrainEditor.adjIndexes2.length && !adjExists; n++) {
                                        let iindexes = TerrainEditor.adjIndexes2[n];
                                        adjExists = chunck.getData(ijk.i + i + iindexes.i, ijk.j + j + iindexes.j, ijk.k + k + iindexes.k) != BlockType.None;
                                    }
                                    if (adjExists) {
                                        todo.push({ i: ijk.i + i, j: ijk.j + j, k: ijk.k + k });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            todo.forEach(task => {
                let chuncks = chunck.setData(props.brushBlock as number, task.i, task.j, task.k, true, affectedBlocks);
                k0 = Math.min(k0, task.k);
                k1 = Math.max(k1, task.k);
                chuncks.forEach(c => { affectedChuncks.push(c); });
            })
        }
        else if (props.mode === TerrainEditionMode.Shrink) {
            let todo = [];
            for (let i = first; i < last; i++) {
                for (let j = first; j < last; j++) {
                    for (let k = first; k < last; k++) {
                        let offset = props.brushSize as number % 2 === 0 ? 0.5 : 0;
                        let d = Math.sqrt((i + offset) * (i + offset) + (j + offset) * (j + offset) + (k + offset) * (k + offset));
                        if (d <= Math.ceil(props.brushSize as number / 2)) {
                            if (Math.random() < (props.noiseValue as number)) {
                                let block = chunck.getData(ijk.i + i, ijk.j + j, ijk.k + k);
                                if (block != BlockType.None) {
                                    let adjEmpty = false;
                                    for (let n = 0; n < TerrainEditor.adjIndexes2.length && !adjEmpty; n++) {
                                        let iindexes = TerrainEditor.adjIndexes2[n];
                                        adjEmpty = chunck.getData(ijk.i + i + iindexes.i, ijk.j + j + iindexes.j, ijk.k + k + iindexes.k) === BlockType.None;
                                    }
                                    if (adjEmpty) {
                                        todo.push({ i: ijk.i + i, j: ijk.j + j, k: ijk.k + k });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            todo.forEach(task => {
                let chuncks = chunck.setData(BlockType.None, task.i, task.j, task.k, true, affectedBlocks);
                k0 = Math.min(k0, task.k);
                k1 = Math.max(k1, task.k);
                chuncks.forEach(c => { affectedChuncks.push(c); });
            })
        }
        else if (props.mode === TerrainEditionMode.Smooth) {
            let todoAdd = [];
            let todoRemove = [];
            for (let i = first; i < last; i++) {
                for (let j = first; j < last; j++) {
                    for (let k = first; k < last; k++) {
                        let offset = props.brushSize as number % 2 === 0 ? 0.5 : 0;
                        let d = Math.sqrt((i + offset) * (i + offset) + (j + offset) * (j + offset) + (k + offset) * (k + offset));
                        if (d <= Math.ceil(props.brushSize as number / 2)) {
                            if (Math.random() < (props.noiseValue as number)) {
                                let block = chunck.getData(ijk.i + i, ijk.j + j, ijk.k + k);
                                let adjCount = 0;
                                for (let n = 0; n < TerrainEditor.adjIndexes3.length; n++) {
                                    let iindexes = TerrainEditor.adjIndexes3[n];
                                    let adjData = chunck.getData(ijk.i + i + iindexes.i, ijk.j + j + iindexes.j, ijk.k + k + iindexes.k);
                                    if (adjData > BlockType.Water) {
                                        adjCount++;
                                    }
                                }
                                if (block <= BlockType.Water) {
                                    if (adjCount >= 15) {
                                        todoAdd.push({ i: ijk.i + i, j: ijk.j + j, k: ijk.k + k });
                                    }
                                }
                                else {
                                    if (adjCount < 17) {
                                        todoRemove.push({ i: ijk.i + i, j: ijk.j + j, k: ijk.k + k });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            todoAdd.forEach(task => {
                let chuncks = chunck.setData(BlockType.Grass, task.i, task.j, task.k, true, affectedBlocks);
                k0 = Math.min(k0, task.k);
                k1 = Math.max(k1, task.k);
                chuncks.forEach(c => { affectedChuncks.push(c); });
            })
            todoRemove.forEach(task => {
                let chuncks = chunck.setData(BlockType.None, task.i, task.j, task.k, true, affectedBlocks);
                k0 = Math.min(k0, task.k);
                k1 = Math.max(k1, task.k);
                chuncks.forEach(c => { affectedChuncks.push(c); });
            })
        }
        else {
            let maxD = Math.ceil(props.brushSize as number / 2);
            if (props.brushShape === BrushShape.Disc) {
                maxD = Math.floor(props.brushSize as number * 0.5) + 0.3;
            }

            for (let i = first; i < last; i++) {
                for (let j = first; j < last; j++) {
                    for (let k = kFirst; k < kLast; k++) {
                        let offset = props.brushSize as number % 2 === 0 ? 0.5 : 0;
                        let d = Infinity;
                        if (props.brushShape === BrushShape.Sphere) {
                            d = Math.sqrt((i + offset) * (i + offset) + (j + offset) * (j + offset) + (k + offset) * (k + offset));
                        }
                        else if (props.brushShape === BrushShape.Cube) {
                            d = Math.max(Math.abs(i + offset), Math.abs(j + offset), Math.abs(k + offset));
                        }
                        if (props.brushShape === BrushShape.Disc) {
                            if (props.brushSize as number % 2 === 0) {
                                d = Math.sqrt((i + 0.5) * (i + 0.5) + (j + 0.5) * (j + 0.5));
                            }
                            else {
                                d = Math.sqrt(i * i + j * j);
                            }
                        }
                        else if (props.brushShape === BrushShape.Square) {
                            d = Math.max(Math.abs(i + offset), Math.abs(j + offset));
                        }
                        if (d <= maxD) {
                            let chuncks: Chunck[] = [];
                            
                            if (props.mode === TerrainEditionMode.Add) {
                                if (Math.random() < (props.noiseValue as number)) {
                                    chuncks = chunck.setData(props.brushBlock as number, ijk.i + i, ijk.j + j, ijk.k + k, true, affectedBlocks);
                                    k0 = Math.min(k0, ijk.k + k);
                                    k1 = Math.max(k1, ijk.k + k);
                                }
                            }
                            else if (props.mode === TerrainEditionMode.AddIfEmpty) {
                                if (Math.random() < (props.noiseValue as number)) {
                                    let block = chunck.getData(ijk.i + i, ijk.j + j, ijk.k + k);
                                    if (block === BlockType.None) {
                                        chuncks = chunck.setData(props.brushBlock as number, ijk.i + i, ijk.j + j, ijk.k + k, true, affectedBlocks);
                                        k0 = Math.min(k0, ijk.k + k);
                                        k1 = Math.max(k1, ijk.k + k);
                                    }
                                }
                            }
                            else if (props.mode === TerrainEditionMode.Erase) {
                                if (Math.random() < (props.noiseValue as number)) {
                                    if (props.brushBlock === BlockType.None) {
                                        chuncks = chunck.setData(BlockType.None, ijk.i + i, ijk.j + j, ijk.k + k, true, affectedBlocks);
                                        k0 = Math.min(k0, ijk.k + k);
                                        k1 = Math.max(k1, ijk.k + k);
                                    }
                                    else {
                                        let block = chunck.getData(ijk.i + i, ijk.j + j, ijk.k + k);
                                        if (block === props.brushBlock) {
                                            chuncks = chunck.setData(BlockType.None, ijk.i + i, ijk.j + j, ijk.k + k, true, affectedBlocks);
                                            k0 = Math.min(k0, ijk.k + k);
                                            k1 = Math.max(k1, ijk.k + k);
                                        }
                                    }
                                }
                            }

                            chuncks.forEach(c => { affectedChuncks.push(c); });
                        }
                    }
                }
            }
        }

        for (let i = 0; i < affectedChuncks.length; i++) {
            let chunck = affectedChuncks.get(i);
            for (let k = k0; k <= k1; k++) {
                chunck.updateIsEmptyIsFull(k);
            }
            if (!props.skipRedraw) {
                chunck.redrawMesh(true);
            }
            this.terrain.save.saveChunck(chunck);
        }
        if (props.saveToLocalStorage && affectedChuncks.length > 0) {
            this.terrain.saveToLocalStorage();
        }
    }
}
