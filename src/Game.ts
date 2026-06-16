import { Scene } from "@babylonjs/core/scene.pure";
import { Engine } from "@babylonjs/core/Engines/engine.pure";
import { MyCamera } from "./MyCamera";
import "@babylonjs/core/Culling/ray.pure";
import { ChunckVertexData } from "./voxel-engine/ChunckVertexData";
import { Terrain } from "./voxel-engine/Terrain";
import { GeneratorType } from "./voxel-engine/TerrainGen/ChunckDataGenerator";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.pure";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture.pure";
import "@babylonjs/core/Materials/Textures/";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.pure";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { GeoConverter } from "./map/Geo";
import { TessademAPIKey } from "./APIKey";
import { Minimap } from "./map/MiniMap";
import { TerrainMaterial } from "./TerrainMaterial";
import { CubicNoiseTexture } from "./CubicNoiseTexture";
import { generateBuildingData } from "./data/BuildingData";
import HavokPhysics from "@babylonjs/havok";
import { Pelleteuse } from "./vehicles/Pelleteuse";
import { Player } from "./player/Player";
import { FloatingBlocksDetector } from "./voxel-engine/FloatingBlocksDetector";
import { Car } from "./vehicles/Car";
import { ChunckDataGeneratorDataSets } from "./voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { Phasm } from "./sumuqan/Phasm";
import { BlockPoleVertexData } from "./voxel-engine/BlockPoleVertexData";
import { DebugPerf } from "./DebugPerf";
import { DebugDisplayTextValue } from "./DebugDisplayTextValue";
import { DebugDisplayFrameValue } from "./DebugDisplayFrameValue";
import { MiniatureFactory } from "./MiniatureFactory";
import { BlockType } from "./voxel-engine/BlockType";
import { PlayerActionBlock } from "./player/PlayerActionBlock";
import { PlayerActionDelete } from "./player/PlayerActionDelete";
registerBuiltInLoaders();

export var SHARE_SERVICE_PATH: string = "https://guyen.tiaratum.com/index.php/";
if (location.host.startsWith("127.0.0.1") || location.host.startsWith("localhost")) {
    SHARE_SERVICE_PATH = "http://localhost/index.php/";
}

export var UI_Color: Color3 = Color3.FromHexString("#00FFFF");

export class Game {

    public static Instance: Game;

    public engine: Engine;
    public scene: Scene;
    public camera: MyCamera;
    public terrain: Terrain | undefined;
    public floatingBlocksDetector: FloatingBlocksDetector | undefined;
    public player: Player;
    public geoConverter: GeoConverter = new GeoConverter();
    public miniatureFactory: MiniatureFactory;
    public skybox: Mesh;

    constructor(public canvas: HTMLCanvasElement) {
        Game.Instance = this;

        this.engine = new Engine(canvas, true, undefined, false)
        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(1, 1, 1, 1);
        this.player = new Player(this);
        this.camera = new MyCamera(this.player, this);
        let light = new HemisphericLight("light", new Vector3(1, 3, -2), this.scene);
        light.direction = (new Vector3(2, 1, -1.5)).normalize();
        light.intensity = 0.7;
		Engine.ShadersRepository = "./public/shaders/";

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
       
        //generateTreeData(this);
        //generateOverpassData(this);

        this.skybox = MeshBuilder.CreateBox("skyBox", { size: 1500 }, this.scene);
        let skyboxMaterial: StandardMaterial = new StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        let skyTexture = new CubeTexture(
            "skyboxes/cloudcompass",
            this.scene,
            ["-px.jpg", "-py.jpg", "-pz.jpg", "-nx.jpg", "-ny.jpg", "-nz.jpg"]);
        skyboxMaterial.reflectionTexture = skyTexture;
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skyboxMaterial.emissiveColor = Color3.FromHexString("#8d6b38").scaleInPlace(0.7);
        this.skybox.material = skyboxMaterial;

        let skyBoxGround = MeshBuilder.CreateGround("skyBoxGround", { width: 1500, height: 1500 }, this.scene);
        let skyBoxGroundMat = new StandardMaterial("skyBoxGround", this.scene);
        skyBoxGroundMat.diffuseColor.copyFromFloats(0, 0, 0);
        skyBoxGroundMat.emissiveColor = Color3.FromInts(141, 107, 56);
        skyBoxGroundMat.specularColor.copyFromFloats(0, 0, 0);
        skyBoxGround.material = skyBoxGroundMat;
        skyBoxGround.parent = this.skybox;

        this.scene.onBeforeRenderObservable.add(() => {
            this.skybox.position.x = this.camera.position.x;
            this.skybox.position.z = this.camera.position.z;
        });

        let debugPerf = new DebugPerf(this);
        debugPerf.initialize();
        debugPerf.show();

        this.canvas.addEventListener("keydown", async (event) => {
            if (event.code === "Numpad0") {
                if (this.terrain) {
                    let ijk = this.terrain.worldPosToGlobalIJK(new Vector3(0, 0, 0));
                    if (ijk) {
                        if (this.terrain.chunckDataGenerator instanceof ChunckDataGeneratorDataSets) {
                            let height = await this.terrain.chunckDataGenerator.asyncEvaluateHeight(ijk.i, ijk.j);
                            height *= this.terrain.blockSizeK_m;
                            this.player.position = new Vector3(0, height + 4, 0);
                            this.player.targetPosition = this.player.position.clone();
                        }
                    }
                }
            }
            if (event.code === "Numpad1") {
                //generateRoadData(this);
            }
            else if (event.code === "Numpad2") {
                generateBuildingData(this);
            }
            else if (event.code === "Numpad3") {
                console.log("Player position: ", this.player.absolutePosition.clone());
                let pelleteuse = new Pelleteuse(this.player.absolutePosition.add(this.player.forward.scale(5)), this);
                pelleteuse.instantiate();
            }
            else if (event.code === "Numpad4") {
                console.log("Player position: ", this.player.absolutePosition.clone());
                let car = new Car(this.player.absolutePosition.add(this.player.forward.scale(5)), this);
                car.instantiate();
            }
            else if (event.code === "Numpad5") {
                console.log("Player position: ", this.player.absolutePosition.clone());
                let phasm = new Phasm(this);
                phasm.setPosition(this.player.absolutePosition.add(this.player.forward.scale(5)));
                phasm.instantiate();
                phasm.initialize();
            }
        });

        let miniMap: Minimap = document.createElement("mini-map") as Minimap;
        document.body.appendChild(miniMap);
        miniMap.setGame(this);

        this.miniatureFactory = new MiniatureFactory(this);

        ChunckVertexData.InitializeData("meshes/chunck-parts.gltf", this.scene).then(async () => {
            await BlockPoleVertexData.InitializeData("meshes/poleblocks.gltf", this.scene);
            // initialize plugin
            const havokInstance = await HavokPhysics({
                locateFile: () => {
                    return "havok/HavokPhysics.wasm"
                }
            });
            // pass the engine to the plugin
            const hk = new HavokPlugin(true, havokInstance);
            // enable physics in the scene with a gravity
            this.scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
        
            let treeDatas = await fetch("trees.json").then(res => res.json());
            let roadDatas = await fetch("roads.json").then(res => res.json());
            let buildingDatas = await fetch("buildings.json").then(res => res.json());
            let textureSize = 1024;
            let squareSize = 64;
            let chunckLengthIJ = 64;
            let chunckCountIJ = textureSize * squareSize / chunckLengthIJ;
            console.log("chunckCountIJ: " + chunckCountIJ);
            this.terrain = new Terrain({
                generatorProps: {
                    type: GeneratorType.DataSets,
                    url: "heightMap_-20_150.png",
                    //url: "map_2.png",
                    noiseUrl: "noise.png",
                    squareSize: squareSize,
                    treeTiles: treeDatas,
                    roadTiles: roadDatas,
                    buildingTiles: buildingDatas
                },
                maxDisplayedLevel: 0,
                blockSizeIJ_m: 0.5,
                blockSizeK_m: 0.5,
                chunckLengthIJ: chunckLengthIJ,
                chunckLengthK: 256,
                chunckCountIJ: chunckCountIJ,
                useAnalytics: true,
                useLocalStorage: false
            });

            this.terrain.initialize();
            this.terrain.chunckManager.setDistance(100);
            this.terrain.sunDir.copyFrom(light.direction);

            let noiseTexture = new CubicNoiseTexture(this.scene);
            noiseTexture.double();
            noiseTexture.double();
            noiseTexture.double();
            noiseTexture.double();
            noiseTexture.double();
            noiseTexture.double();
            noiseTexture.double();
            noiseTexture.randomize();
            noiseTexture.smooth();

            console.log(noiseTexture.size);
            let cubicTex = noiseTexture.get3DTexture();

            let mat = new TerrainMaterial("terrain", this.scene);
            mat.setTexture("noiseTexture", cubicTex);
            mat.setLightInvDir(light.direction);
            this.terrain.materials = [mat];

            this.floatingBlocksDetector = new FloatingBlocksDetector(this.terrain);

            this.player.playerActionManager.linkAction(1, await PlayerActionBlock.Create(this.player, BlockType.Grass));
            this.player.playerActionManager.linkAction(2, await PlayerActionBlock.Create(this.player, BlockType.Dirt));
            this.player.playerActionManager.linkAction(3, await PlayerActionBlock.Create(this.player, BlockType.Wood));
            this.player.playerActionManager.linkAction(4, await PlayerActionBlock.Create(this.player, BlockType.Rock));
            this.player.playerActionManager.linkAction(5, await PlayerActionBlock.Create(this.player, BlockType.Asphalt));
            this.player.playerActionManager.linkAction(6, await PlayerActionBlock.Create(this.player, BlockType.WhiteAsphalt));
            this.player.playerActionManager.linkAction(9, await PlayerActionBlock.Create(this.player, BlockType.MetalPole));
            this.player.playerActionManager.linkAction(0, new PlayerActionDelete(this.player));

            for (let blockType = BlockType.Grass; blockType <= BlockType.MetalPole; blockType++) {
                if (blockType === BlockType.None) {
                    continue;
                }
                if (blockType === BlockType.Water) {
                    continue;
                }
                if (blockType === BlockType.Unknown) {
                    continue;
                }
                await this.player.playerInventory.addItemByName("block-" + BlockType[blockType]);
            }

            //this.player.playerActionManager.linkAction(3, new PlayerActionTreeGenerator(this.player));
            //this.player.playerActionManager.linkAction(4, new PlayerActionBall(this.player));
            /*
            this.terrain.customChunckMaterialSet = (chunck: Chunck) => {
                if (chunck.mesh && !(chunck.mesh.material instanceof TerrainMaterial)) {
                    let mat = new TerrainMaterial("terrain", this.scene);
                    mat.setLightInvDir(light.direction);
                    mat.setTexture("noiseTexture", cubicTex);
                    chunck.mesh.material = mat;
                }
                this.terrain!.chunckManager.requestGlobalLightUpdate(chunck);
                chunck.adjacents.forEach(adj => {
                    if (adj) {
                        this.terrain!.chunckManager.requestGlobalLightUpdate(adj);
                    }
                })
            }
            */
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

    public async fetchElevation() {
        let totalTextureSize = 1024;
        let texturePartSize = 128;

        let minH = -20;
        let maxH = 150;

        let count = totalTextureSize / texturePartSize;
        
        let dLat = Math.atan2(16384, this.geoConverter.radius) / Math.PI * 180;
        let dLong = Math.atan2(16384, this.geoConverter.radius * Math.cos(this.geoConverter.latZero * Math.PI / 180)) / Math.PI * 180;

        let lat0 = this.geoConverter.latZero - dLat;
        let long0 = this.geoConverter.longZero - dLong;
        let lat1 = this.geoConverter.latZero + dLat;
        let long1 = this.geoConverter.longZero + dLong;

        let latStep = (lat1 - lat0) / count;
        let longStep = (long1 - long0) / count;

        let canvas = document.createElement("canvas");
        canvas.width = totalTextureSize;
        canvas.height = totalTextureSize;
        let ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let s = 1;
        //for (let i = count / 2 - s; i < count / 2 + s; i++) {
        //    for (let j = count / 2 - s; j < count / 2 + s; j++) {
        for (let i = 0; i < count; i++) {
            for (let j = 0; j < count; j++) {
                let latMin = lat1 - (i + 1) * latStep;
                let latMax = lat1 - i * latStep;
                let longMin = long0 + j * longStep;
                let longMax = long0 + (j + 1) * longStep;

                let res = await fetch("https://tessadem.com/api/elevation?key=" + TessademAPIKey + "&mode=area&rows=128&columns=128&locations=" + latMin.toFixed(7) + "," + longMin.toFixed(7) + "|" + latMax.toFixed(7) + "," + longMax.toFixed(7) + "&format=json");
                let data = await res.json();
                let results = data["results"];

                let imageData = new ImageData(texturePartSize, texturePartSize);
                for (let ii = 0; ii < texturePartSize; ii++) {
                    for (let jj = 0; jj < texturePartSize; jj++) {
                        let h = results[ii][jj]["elevation"];
                        let hNorm = (h - minH) / (maxH - minH);
                        hNorm = Math.max(0, Math.min(1, hNorm));
                        h = Math.floor(hNorm * 256);
                        let index = (ii * texturePartSize + jj) * 4;
                        imageData.data[index] = h;
                        imageData.data[index + 1] = h;
                        imageData.data[index + 2] = h;
                        imageData.data[index + 3] = 255;
                    }
                }
                ctx.putImageData(imageData, j * texturePartSize, i * texturePartSize);
                console.log(i + ", " + j);
            }
        }
        var tmpLink = document.createElement( 'a' );
        tmpLink.download = "heightMap" + ".png";
        tmpLink.href = canvas.toDataURL();  
        
        document.body.appendChild( tmpLink );
        tmpLink.click(); 
        document.body.removeChild( tmpLink );
    }
}

//window["Game"] = Game;
customElements.define("mini-map", Minimap);
customElements.define("debug-display-frame-value", DebugDisplayFrameValue);
customElements.define("debug-display-text-value", DebugDisplayTextValue);