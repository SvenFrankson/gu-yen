import { Axis, Mesh, MeshBuilder } from "@babylonjs/core";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { QuaternionFromYZAxis } from "babylonjs-geometry-kit"
import { Game } from "../Game";
import { ChunckDataGeneratorDataSets } from "../voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";
import { Terrain } from "../voxel-engine/Terrain";
import { Line } from "../voxel-engine/Shape/Instances/Line";
import { BlockType } from "../voxel-engine/BlockType";
import { TerrainEditionMode } from "../voxel-engine/TerrainEditor/TerrainEditor";
import { FatLine } from "../voxel-engine/Shape/Instances/FatLine";
import { IDrawnBlocks } from "../voxel-engine/Shape/Shape";
import { crunchDataString, IVoxelDrawingData, IVoxelDrawingDataSerialized } from "../voxel-engine/TerrainGen/RawProp/VoxelDrawing";

class TreeNode {

    public children: TreeNode[] = [];
    public depth: number = 0;
    public radius: number = 1;
    public direction: Vector3 = new Vector3(0, 1, 0);

    constructor(public tree: Tree, public parent: TreeNode | null = null, public position: Vector3 = Vector3.Zero()) {
        if (parent) {
            this.depth = parent.depth + 1;
            this.direction = this.position.subtract(parent.position).normalize();
        }
        let f = 1 - this.depth / this.tree.maxDepth;
        this.radius = tree.rootRadius * f + tree.endRadius * (1 - f);
    }

    public generateChildren(): void {
        if (this.depth < this.tree.maxDepth) {
            let count = this.tree.countByDepth(this.depth);
            for (let n = 0; n < count; n++) {
                let childrenDir = this.direction.clone();
                let length = this.tree.minLength + Math.random() * (this.tree.maxLength - this.tree.minLength);
                childrenDir.scaleInPlace(length);
                let angle = Math.random() * this.tree.maxAngleByDepth(this.depth);
                let axis = Vector3.Cross(this.direction, new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)).normalize();
                let rotation = Quaternion.RotationAxis(axis, angle);
                childrenDir.rotateByQuaternionToRef(rotation, childrenDir);
                let child = new TreeNode(this.tree, this, this.position.add(childrenDir));
                this.children.push(child);
                child.generateChildren();
            }
        }
    }
    
    public draw(root: Mesh): void {
        if (this.parent) {
            let cylinder = MeshBuilder.CreateCylinder("cylinder", { diameter: this.radius * 2, height: this.position.subtract(this.parent.position).length() }, root.getScene());
            cylinder.position = this.position.add(this.parent.position).scale(0.5);
            cylinder.rotationQuaternion = QuaternionFromYZAxis(this.direction, Axis.Z);
            cylinder.parent = root;
        }
        this.children.forEach(child => child.draw(root));
    }
    
    public voxelDraw(terrain: Terrain, drawnBlocks?: IDrawnBlocks[]): void {
        if (this.parent) {
            if (this.radius > 0.5) {
                let fatLine = new FatLine(terrain, this.position, this.parent.position, Math.max(this.radius * 2, 2));
                fatLine.draw(BlockType.Wood, undefined, undefined, drawnBlocks);
            }
            else {
                let line = new Line(terrain, { p0: this.position, p1: this.parent.position });
                let ijk0 = terrain.getChunckAndIJKAtPos(this.position, 0);
                let ijk1 = terrain.worldPosToGlobalIJK(this.parent.position);
                if (ijk0 && ijk1) {
                    line.draw(ijk0.chunck, ijk0.ijk, ijk0.chunck.IJKGlobalToIJKLocal(ijk1), BlockType.Wood, TerrainEditionMode.Add, undefined, undefined, drawnBlocks);
                }
            }
        }
        this.children.forEach(child => child.voxelDraw(terrain, drawnBlocks));
    }
}

class Tree {
    public height = 10;
    public minLength: number = 4;
    public maxLength: number = 6;
    public rootRadius: number = 1;
    public endRadius: number = 0.1;
    public maxDepth: number = 5;
    public countByDepth: (depth: number) => number = (depth) => {
        return Math.min(Math.max(Math.floor((depth + 2) * Math.random()), 1), 2);
    };
    public maxAngleByDepth: (depth: number) => number = (depth) => {
        return Math.min(Math.PI * 0.15 * depth, Math.PI * 0.5);
    }

    public root: TreeNode;

    constructor() {
        this.root = new TreeNode(this);
    }
}

export class TreeGenerator {

    public async runTest(game: Game): Promise<void> {
        let rootPos = Vector3.Zero();
        let dir = game.camera.getDirection(Axis.Z);
        dir.y = 0;
        dir.normalize();
        rootPos = game.camera.position.add(dir.scale(30));

        if (game.terrain) {
            let ijkGlobal = game.terrain.worldPosToGlobalIJK(rootPos);
            if (ijkGlobal) {
                if (game.terrain.chunckDataGenerator instanceof ChunckDataGeneratorDataSets) {
                    let height = await game.terrain.chunckDataGenerator.asyncEvaluateHeight(ijkGlobal.i, ijkGlobal.j);
                    rootPos.y = height;
                }
            }

            let tree = new Tree();
            tree.minLength = 1 + Math.floor(Math.random() * 6);
            tree.maxLength = tree.minLength + Math.floor(Math.random() * 6);
            tree.rootRadius = 0.1 + Math.random() * 2.5;
            tree.endRadius = 0.1 + Math.random() * 0.4;
            tree.maxDepth = 3 + Math.floor(Math.random() * 5);
            tree.root.position = rootPos;
            tree.root.generateChildren();

            let drawnBlocks: IDrawnBlocks[] = [];
            tree.root.voxelDraw(game.terrain!, drawnBlocks);
            let minI = Math.min(...drawnBlocks.map(b => b.i));
            let maxI = Math.max(...drawnBlocks.map(b => b.i));
            let minJ = Math.min(...drawnBlocks.map(b => b.j));
            let maxJ = Math.max(...drawnBlocks.map(b => b.j));
            let minK = Math.min(...drawnBlocks.map(b => b.k));
            let maxK = Math.max(...drawnBlocks.map(b => b.k));
            console.log("minI: " + minI + ", maxI: " + maxI);
            console.log("minJ: " + minJ + ", maxJ: " + maxJ);
            console.log("minK: " + minK + ", maxK: " + maxK);
            drawnBlocks.forEach(b => {
                b.i -= minI;
                b.j -= minJ;
                b.k -= minK;
            });
            let w = maxI - minI + 1;
            let d = maxJ - minJ + 1;
            let h = maxK - minK + 1;

            let voxelDrawingData: IVoxelDrawingDataSerialized = {
                offset: { i: minI - ijkGlobal.i, j: minJ - ijkGlobal.j, k: 0 },
                wI: w,
                dJ: d,
                hK: h,
                dataString: ""
            };
            let data: Uint8Array = new Uint8Array(w * d * h);
            data.fill(BlockType.Unknown);
            
            drawnBlocks.forEach(b => {
                data[b.i + b.j * w + b.k * w * d] = b.blockType;
            });

            voxelDrawingData.dataString = crunchDataString(btoa(String.fromCharCode(...data)));
            data = new Uint8Array(0);

            console.log("Tree height = " + h.toFixed(0));
            console.log(voxelDrawingData);
            //tree.root.draw(new Mesh("tree", game.scene));
        }
    }
}