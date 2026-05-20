import { Chunck } from "./Chunck";
import { Terrain } from "./Terrain";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { BlockType } from "./BlockType";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniqueList } from "../UniqueList";
import { GetBBoxFromVertexData, TranslateVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsMotionType, PhysicsShapeConvexHull, PhysicsShapeCylinder, PhysicsShapeMesh } from "@babylonjs/core";

export class FloatingBlocksDetector {

    public static maxRange: number = 32;
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

    public grid: Uint16Array = new Uint16Array(FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize);
    public getMarkedValue(i: number, j: number, k: number): number {
        return Math.floor(this.grid[i + j * FloatingBlocksDetector.maxSize + k * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize] / 256);
    }
    public getBlockTypeValue(i: number, j: number, k: number): number {
        return this.grid[i + j * FloatingBlocksDetector.maxSize + k * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize] % 256;
    }
    public setMarkedValue(group: number, i: number, j: number, k: number) {
        let blockType = this.getBlockTypeValue(i, j, k);
        this.grid[i + j * FloatingBlocksDetector.maxSize + k * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize] = group * 256 + blockType;
    }
    public setBlockTypeValue(blockType: number, i: number, j: number, k: number) {
        let group = this.getMarkedValue(i, j, k);
        this.grid[i + j * FloatingBlocksDetector.maxSize + k * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize] = group * 256 + blockType;
    }

    public markBlock(blockType: number,i: number, j: number, k: number) {
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
                    const g = this.getMarkedValue(i2, j2, k2);
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
                                if (this.getMarkedValue(ii, jj, kk) === g) {
                                    this.setMarkedValue(group, ii, jj, kk);
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

        this.setBlockTypeValue(blockType, i, j, k);
        this.setMarkedValue(group, i, j, k);
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

    public findFloatingBlocks(iGlobal0: number, jGlobal0: number, kGlobal0: number): UniqueList<Chunck> | undefined {
        return;
        this.reset();
        this.iGlobal0 = iGlobal0;
        this.jGlobal0 = jGlobal0;
        this.kGlobal0 = kGlobal0;

        let chunk = this.terrain.getChunck(0, Math.floor(iGlobal0 / this.terrain.chunckLengthIJ), Math.floor(jGlobal0 / this.terrain.chunckLengthIJ));
        if (!chunk) return;
        let iPos0 = chunk.iPos;
        let jPos0 = chunk.jPos;
        console.log("Center chunck position:", iPos0, jPos0);
        let rChunks = 2;
        let chuncks: Chunck[][] = [];
        for (let i = 0; i < 2 * rChunks + 1; i++) {
            chuncks[i] = [];
            for (let j = 0; j < 2 * rChunks + 1; j++) {
                let c = this.terrain.getChunck(0, iPos0 + i - rChunks, jPos0 + j - rChunks);
                if (c) {
                    chuncks[i][j] = c;
                }
            }
        }
        console.log(chuncks);

        for (let d = 1; d < FloatingBlocksDetector.maxRange; d++) {
            let doThing = (ii: number, jj: number, kk: number) => {
                let iGlobal = iGlobal0 + ii;
                let jGlobal = jGlobal0 + jj;
                let kGlobal = kGlobal0 + kk;

                let iPos = Math.floor(iGlobal / this.terrain.chunckLengthIJ);
                let jPos = Math.floor(jGlobal / this.terrain.chunckLengthIJ);
                let chunck = chuncks[iPos - iPos0 + rChunks]?.[jPos - jPos0 + rChunks];
                if (chunck) {
                    let i = iGlobal - chunck.iGlobalOffset;
                    let j = jGlobal - chunck.jGlobalOffset;
                    let k = kGlobal - chunck.kGlobalOffset;
                    let blockType = chunck.getData(i, j, k);
                    if (blockType > 0) {
                        this.markBlock(blockType, ii + FloatingBlocksDetector.maxRange, jj + FloatingBlocksDetector.maxRange, kk + FloatingBlocksDetector.maxRange);
                    }
                }
                else {
                    console.warn("Chunck not found at", iPos, jPos, "for d", d);
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

        console.log("Blocks groups found:", this.currentGroup - 1);

        let groundGroups: number[] = [];
        let doThing = (ii: number, jj: number, kk: number) => {
            let g = this.getMarkedValue(ii + FloatingBlocksDetector.maxRange, jj + FloatingBlocksDetector.maxRange, kk + FloatingBlocksDetector.maxRange);
            if (g > 0 && !groundGroups.includes(g)) {
                groundGroups.push(g);
            }
        }
        let d = FloatingBlocksDetector.maxRange - 1;
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

        console.log("Groups connected to the ground:", groundGroups);

        let floatingGroups = [];
        for (let g = 1; g < this.currentGroup; g++) {
            if (!groundGroups.includes(g)) {
                floatingGroups.push(g);
            }
        }

        console.log("Floating groups:", floatingGroups);

        let affectedChunks = new UniqueList<Chunck>();
        for (let n = 0; n < floatingGroups.length; n++) {
            let g = floatingGroups[n];
            let floatingData = new Uint8Array(FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize);
            let i0 = Infinity;
            let j0 = Infinity;
            let k0 = Infinity;
            let i1 = -Infinity;
            let j1 = -Infinity;
            let k1 = -Infinity;
            for (let ii = 0; ii < FloatingBlocksDetector.maxSize; ii++) {
                for (let jj = 0; jj < FloatingBlocksDetector.maxSize; jj++) {
                    for (let kk = 0; kk < FloatingBlocksDetector.maxSize; kk++) {
                        if (this.getMarkedValue(ii, jj, kk) === g) {
                            i0 = Math.min(i0, ii);
                            j0 = Math.min(j0, jj);
                            k0 = Math.min(k0, kk);
                            i1 = Math.max(i1, ii);
                            j1 = Math.max(j1, jj);
                            k1 = Math.max(k1, kk);
                            floatingData[ii + jj * FloatingBlocksDetector.maxSize + kk * FloatingBlocksDetector.maxSize * FloatingBlocksDetector.maxSize] = this.getBlockTypeValue(ii, jj, kk);
                            let chunks = chunk.setData(BlockType.None,
                                ii + this.iGlobal0 - chunk.iGlobalOffset - FloatingBlocksDetector.maxRange,
                                jj + this.jGlobal0 - chunk.jGlobalOffset - FloatingBlocksDetector.maxRange,
                                kk + this.kGlobal0 - chunk.kGlobalOffset - FloatingBlocksDetector.maxRange
                            );
                            affectedChunks.push(...chunks);
                        }
                    }
                }
            }

            console.log(floatingData);

            let vertexData = this.terrain.chunckBuilder.BuildFloatingMesh(this.terrain, floatingData, FloatingBlocksDetector.maxSize, i0, j0, k0, i1, j1, k1);
            TranslateVertexDataInPlace(
                vertexData,
                new Vector3(
                    (i0 - FloatingBlocksDetector.maxRange) * this.terrain.blockSizeIJ_m,
                    (k0 - FloatingBlocksDetector.maxRange) * this.terrain.blockSizeK_m,
                    (j0 - FloatingBlocksDetector.maxRange) * this.terrain.blockSizeIJ_m
                )
            );
            let bbox = GetBBoxFromVertexData(vertexData);
            let center = bbox.min.add(bbox.max).scale(0.5);
            let axis = Vector3.Cross(Vector3.Up(), center);
            if (Math.abs(axis.x) > Math.abs(axis.z)) {
                if (axis.x > 0) {
                    axis = Vector3.Right();
                }
                else {
                    axis = Vector3.Left();
                }
            }
            else {
                if (axis.z > 0) {
                    axis = Vector3.Forward();
                }
                else {
                    axis = Vector3.Backward();
                }
            }
            let testMesh = new Mesh("floatingBlockTestMesh" + n, this.terrain.scene);
            testMesh.material = this.terrain.getMaterial(0);
            vertexData.applyToMesh(testMesh);
            
            /*
            let cross = MeshBuilder.CreateLineSystem(
                "cross",
                {
                    lines: [
                        [new Vector3(0, 0, -1), new Vector3(0, 0, 1)],
                        [new Vector3(0, -1, 0), new Vector3(0, 1, 0)],
                        [new Vector3(-1, 0, 0), new Vector3(1, 0, 0)],
                    ]
                },
                this.terrain.scene
            );
            cross.parent = testMesh;
            */

            console.log(vertexData);

            testMesh.position = this.terrain.globalIJKToWorldPos(this.iGlobal0, this.jGlobal0, this.kGlobal0);

            const body = new PhysicsBody(testMesh, PhysicsMotionType.DYNAMIC, false, this.terrain.scene);
            body.setMassProperties({
                mass: 1
            });
            body.shape = new PhysicsShapeConvexHull(testMesh, this.terrain.scene);
            body.shape.material = {friction: 0.8, restitution: 0};

            let f = testMesh.position.subtract(this.terrain.scene.activeCamera?.position!).normalize().scale(0.2);
            body.applyImpulse(f, testMesh.position);

            console.log(testMesh);
        }
        return affectedChunks;
    }
}