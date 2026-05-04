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
            console.log("Generating " + count + " children for depth " + this.depth);
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
    
    public voxelDraw(terrain: Terrain): void {
        if (this.parent) {
            let chunckIJK0 = terrain.getChunckAndIJKAtPos(this.position, 0);
            let IJK1 = terrain.worldPosToGlobalIJK(this.parent.position);
            if (chunckIJK0 && chunckIJK0.chunck && IJK1) {
                let localIJK1 = chunckIJK0.chunck.IJKGlobalToIJKLocal(IJK1);
                console.log("Drawing line from " + JSON.stringify(chunckIJK0.ijk) + " to " + JSON.stringify(localIJK1) + " IJK1 global: " + JSON.stringify(IJK1));
                //let line = new Line(terrain);
                //line.draw(chunckIJK0.chunck, chunckIJK0.ijk, localIJK1, BlockType.Wood, TerrainEditionMode.Add);
                let fatLine = new FatLine(terrain, this.position, this.parent.position, Math.max(this.radius * 2, 2));
                fatLine.draw(BlockType.Wood);
            }
        }
        this.children.forEach(child => child.voxelDraw(terrain));
    }
}

class Tree {
    public height = 10;
    public minLength: number = 4;
    public maxLength: number = 6;
    public rootRadius: number = 2;
    public endRadius: number = 1;
    public maxDepth: number = 7;
    public countByDepth: (depth: number) => number = (depth) => {
        return Math.min(Math.max(Math.floor((depth + 1) * Math.random()), 1), 2);
    };
    public maxAngleByDepth: (depth: number) => number = (depth) => {
        return Math.min(Math.PI * 0.1 * depth, Math.PI * 0.5);
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
            let ijk = game.terrain.worldPosToGlobalIJK(rootPos);
            if (ijk) {
                if (game.terrain.chunckDataGenerator instanceof ChunckDataGeneratorDataSets) {
                    let height = await game.terrain.chunckDataGenerator.asyncEvaluateHeight(ijk.i, ijk.j);
                    rootPos.y = height;
                }
            }
        }

        let tree = new Tree();
        tree.root.position = rootPos;
        tree.root.generateChildren();

        tree.root.voxelDraw(game.terrain!);
        //tree.root.draw(new Mesh("tree", game.scene));
    }
}