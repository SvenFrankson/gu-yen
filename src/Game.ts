import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { MyCamera } from "./MyCamera";
import "@babylonjs/core/Culling/ray";
import { ChunckVertexData } from "./voxel-engine/ChunckVertexData";
import { Terrain } from "./voxel-engine/Terrain";
import { GeneratorType } from "./voxel-engine/TerrainGen/ChunckDataGenerator";
import { Color3, CubeTexture, HemisphericLight, Mesh, MeshBuilder, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";
import { GeoConverter } from "./map/Geo";
import { TessademAPIKey } from "./APIKey";
import { Minimap } from "./map/MiniMap";
import { TreeGenerator } from "./devtools/TreeGenerator";
import { TerrainMaterial } from "./TerrainMaterial";

export class Game {

    public static Instance: Game;

    public engine: Engine;
    public scene: Scene;
    public camera: MyCamera;
    public terrain: Terrain | undefined;
    public geoConverter: GeoConverter = new GeoConverter();
    public skybox: Mesh;

    constructor(public canvas: HTMLCanvasElement) {
        Game.Instance = this;

        this.engine = new Engine(canvas, true)
        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(0, 0, 1, 1);
        this.camera = new MyCamera(this);
        let light = new HemisphericLight("light", new Vector3(1, 3, -2), this.scene);
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

        let skyBoxHolder = new Mesh("skybox-holder");

        this.skybox = MeshBuilder.CreateBox("skyBox", { size: 1500 }, this.scene);
        this.skybox.parent = skyBoxHolder;
        let skyboxMaterial: StandardMaterial = new StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        let skyTexture = new CubeTexture(
            "skyboxes/cloud",
            this.scene,
            ["-px.jpg", "-py.jpg", "-pz.jpg", "-nx.jpg", "-ny.jpg", "-nz.jpg"]);
        skyboxMaterial.reflectionTexture = skyTexture;
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skyboxMaterial.emissiveColor = Color3.FromHexString("#8d6b38").scaleInPlace(0.7);
        this.skybox.material = skyboxMaterial;

        let treeGenerator = new TreeGenerator();
        this.canvas.addEventListener("keydown", (event) => {
            if (event.code === "Space") {
                console.log("Generating tree...");
                treeGenerator.runTest(this);
            }
        });

        let miniMap: Minimap = document.createElement("mini-map") as Minimap;
        document.body.appendChild(miniMap);
        miniMap.setGame(this);


        ChunckVertexData.InitializeData("meshes/chunck-parts.gltf", this.scene).then(async () => {

            let treeDatas = await fetch("trees.json").then(res => res.json());
            let textureSize = 1024;
            let squareSize = 32;
            let chunckLengthIJ = 32;
            let chunckCountIJ = textureSize * squareSize / chunckLengthIJ;
            console.log("chunckCountIJ: " + chunckCountIJ);
            this.terrain = new Terrain({
                generatorProps: {
                    type: GeneratorType.DataSets,
                    url: "heightMap_-20_150.png",
                    //url: "map_2.png",
                    noiseUrl: "noise.png",
                    squareSize: squareSize,
                    treeTiles: treeDatas
                },
                maxDisplayedLevel: 0,
                blockSizeIJ_m: 1,
                blockSizeK_m: 1,
                chunckLengthIJ: chunckLengthIJ,
                chunckLengthK: 256,
                chunckCountIJ: chunckCountIJ,
                useAnalytics: true
            });

            this.terrain.initialize();

            let mat = new TerrainMaterial("terrain", this.scene);
            console.log(mat.shaderPath);
            this.terrain.materials = [mat];

            this.terrain.chunckManager.setDistance(200);

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

window["Game"] = Game;
customElements.define("mini-map", Minimap);