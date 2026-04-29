import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { MyCamera } from "./MyCamera";
import "@babylonjs/core/Culling/ray";
import { ChunckVertexData } from "./voxel-engine/ChunckVertexData";
import { Terrain } from "./voxel-engine/Terrain";
import { GeneratorType } from "./voxel-engine/TerrainGen/ChunckDataGenerator";
import { HemisphericLight, StandardMaterial, Vector3 } from "@babylonjs/core";
import { BlockType } from "./voxel-engine/BlockType";

export class Game {

    public engine: Engine;
    public scene: Scene;
    public camera: MyCamera;
    public terrain: Terrain | undefined;

    constructor(public canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true)
        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(0, 0, 1, 1);
        this.camera = new MyCamera(this);
        new HemisphericLight("light", new Vector3(1, 3, -2), this.scene);

        ChunckVertexData.InitializeData("meshes/chunck-parts.gltf", this.scene).then(async () => {
            this.terrain = new Terrain({
                generatorProps: {
                    type: GeneratorType.Flat,
                    blockType: BlockType.Grass,
                    altitude: 64
                },
                maxDisplayedLevel: 0,
                blockSizeIJ_m: 1,
                blockSizeK_m: 1,
                chunckLengthIJ: 32,
                chunckLengthK: 128,
                chunckCountIJ: 32,
                useAnalytics: true
            });

            let mat = new StandardMaterial("mat", this.scene);
            this.terrain.materials = [mat];

            this.terrain.initialize();

            //this.initializeTerrainEditor();
        });

        window.addEventListener("resize", () => {
            this.onResize();
        });
    }

    public start() {
        this.engine.runRenderLoop(() => {
            this.scene.render()
        })
    }

    public onResize() {
        this.engine.resize();
    }
}