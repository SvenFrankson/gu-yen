import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { MyCamera } from "./MyCamera";
import "@babylonjs/core/Culling/ray";
import { ChunckVertexData } from "./voxel-engine/ChunckVertexData";
import { Terrain } from "./voxel-engine/Terrain";
import { GeneratorType } from "./voxel-engine/TerrainGen/ChunckDataGenerator";
import { Color4, HemisphericLight, MeshBuilder, StandardMaterial, Vector3 } from "@babylonjs/core";
import { BlockType } from "./voxel-engine/BlockType";
import { GeoConverter } from "./map/Geo";

export class Game {

    public engine: Engine;
    public scene: Scene;
    public camera: MyCamera;
    public terrain: Terrain | undefined;
    public geoConverter: GeoConverter = new GeoConverter();

    constructor(public canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true)
        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(0, 0, 1, 1);
        this.camera = new MyCamera(this);
        let light = new HemisphericLight("light", new Vector3(1, 3, -2), this.scene);
        light.intensity = 0.7;

        /*
        fetch("to_courb_l.json").then(async (res) => {
            let json = await res.json();
            let talencePoints = json.filter((p: any) => { return p["commune"] === "Talence" });
            console.log(talencePoints)
            for (let n = 0; n < talencePoints.length; n++) {
                let p = talencePoints[n];
                let y = p["z"] || 0;
                let shape = p["geo_shape"];
                if (shape && shape["geometry"]) {
                    let coordinates = shape["geometry"]["coordinates"];
                    let points: Vector3[] = [];
                    for (let i = 0; i < coordinates.length; i++) {
                        let c = coordinates[i];
                        let long = c[0];
                        let lat = c[1];
                        let position = this.geoConverter.latLongToVector3(lat, long);
                        position.y = y + 10;
                        points.push(position);
                    }

                    let colors = points.map((p: any) => { return new Color4(1, 0, 0, 1) });
                    if (Math.round(2 * y) % 3 === 0) {
                        colors = points.map((p: any) => { return new Color4(0, 0, 0, 1) });
                    }
                    if (Math.round(2 * y) % 3 === 1) {
                        colors = points.map((p: any) => { return new Color4(1, 1, 1, 1) });
                    }
                    let line = MeshBuilder.CreateLines("line" + n, { points: points, colors: colors }, this.scene);
                }
            }
        });
        */

        ChunckVertexData.InitializeData("meshes/chunck-parts.gltf", this.scene).then(async () => {
            this.terrain = new Terrain({
                generatorProps: {
                    type: GeneratorType.PNG,
                    url: "map_2.png",
                    noiseUrl: "noise.png",
                    squareSize: 8
                },
                maxDisplayedLevel: 0,
                blockSizeIJ_m: 1,
                blockSizeK_m: 1,
                chunckLengthIJ: 32,
                chunckLengthK: 256,
                chunckCountIJ: 256,
                useAnalytics: true
            });


            let mat = new StandardMaterial("mat", this.scene);
            this.terrain.materials = [mat];

            this.terrain.initialize();
            this.terrain.chunckManager.setDistance(400);

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