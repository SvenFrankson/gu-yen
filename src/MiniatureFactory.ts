import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.pure";
import { Camera } from "@babylonjs/core/Cameras/camera.pure";
import { Engine } from "@babylonjs/core/Engines/engine.pure";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.pure";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.pure";
import { Scene } from "@babylonjs/core/scene.pure";
import { Game, UI_Color } from "./Game";
import { ScreenshotTools } from "@babylonjs/core/Misc/screenshotTools.pure";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { BlockType, BlockTypeColors, IsPole } from "./voxel-engine/BlockType";
import { ColorizeVertexDataInPlace, CreateBeveledBox, CreateBeveledBoxVertexData } from "babylonjs-tiaratumgames-tools";
import { NextFrame } from "./Tools";
import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { MakeStandardMaterial } from "./MaterialUtils";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";

export class MiniatureFactory {

    public engine: Engine;
    public scene: Scene;
    public light: HemisphericLight;
    public camera: ArcRotateCamera;
    public baseMaterial: StandardMaterial;

    private _cachedData: Map<string, string> = new Map<string, string>();

    constructor(public game: Game) {
        let canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        this.engine = new Engine(canvas);
        this.scene = new Scene(this.engine);
        this.scene.clearColor.copyFromFloats(0, 0, 0, 0);
        this.light = new HemisphericLight("miniature-light", new Vector3(- 2, 3, - 1).normalize(), this.scene);
        this.camera = new ArcRotateCamera("miniature-camera", - Math.PI / 6, Math.PI / 3, 100, Vector3.Zero());
        this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        this.camera.orthoTop = 1;
        this.camera.orthoRight = 1;
        this.camera.orthoBottom = - 1;
        this.camera.orthoLeft = - 1;
        this.baseMaterial = MakeStandardMaterial(this.scene, new Color3(1, 1, 1), 0.1, 0.2);
    }

    public async makeBlockIconString(block: BlockType): Promise<string | undefined> {
        let key = "block_" + block.toFixed(0);
        if (this._cachedData.get(key)) {
            return this._cachedData.get(key);
        }

        let canvas = await this.makeBlockIcon(block);
        
        let dataUrl = canvas.toDataURL();
        this._cachedData.set(key, dataUrl);
        return dataUrl;
    }

    /*
    public async makePaintIconString(colorId: number | string): Promise<string> {
        let index = DodoColorIdToIndex(colorId);

        let key = "paint_" + index.toFixed(0);
        if (this._cachedData.get(key)) {
            return this._cachedData.get(key);
        }

        let canvas = document.createElement("canvas");
        canvas.width = 2;
        canvas.height = 2;
        let context = canvas.getContext("2d");
        context.fillStyle = DodoColors[index].hex;
        context.fillRect(0, 0, 2, 2);

        let dataUrl = canvas.toDataURL();
        this._cachedData.set(key, dataUrl);
        return dataUrl;
    }
    */

    private _working = false;
    public async makeBlockIcon(block: BlockType | string): Promise<HTMLCanvasElement> {
        while (this._working) {
            await NextFrame();
        }
        this._working = true;
        let h = 2 * this.game.terrain!.blockSizeIJ_m;
        let w = h;
        let d = h;
        if (IsPole(block as BlockType)) {
            w = h / 5;
            d = h / 5;
        }
        let brickVertexData = CreateBeveledBoxVertexData({ width: w, height: h, depth: d });
        let brick = new Mesh("miniature-brick", this.scene);
        brick.renderOutline = true;
        brick.outlineColor.copyFrom(UI_Color);
        brick.outlineWidth = 0.03;
        brick.material = this.baseMaterial;
        brick.alwaysSelectAsActiveMesh = true;
        let color = BlockTypeColors[block as BlockType];
        if (color) {
            ColorizeVertexDataInPlace(brickVertexData, color);
        }
        brickVertexData.applyToMesh(brick);
        //let brick = MeshBuilder.CreateBox("box", { size: 1 }, this.scene);

        this.engine.runRenderLoop(() => {
            this.scene.render(true);
        })

        let running = 0;
        while (running < 1) {
            let mesh = this.scene.meshes[this.scene.meshes.length - 1];
            if (mesh instanceof Mesh && mesh.isReady(true)) {
                running++;
            }
            else {
                await NextFrame();
            }
        }

        return new Promise<HTMLCanvasElement>(resolve => {
            requestAnimationFrame(async () => {
                let center = brick.getBoundingInfo();
                this.camera.target.copyFrom(center.boundingBox.minimumWorld).addInPlace(center.boundingBox.maximumWorld).scaleInPlace(0.5);
                let size = center.boundingBox.maximumWorld.subtract(center.boundingBox.minimumWorld).length();

                this.camera.orthoTop = size * 0.5;
                this.camera.orthoRight = size * 0.5;
                this.camera.orthoBottom = - size * 0.5;
                this.camera.orthoLeft = - size * 0.5;

                ScreenshotTools.CreateScreenshot(
                    this.engine,
                    this.camera,
                    128,
                    async (data) => {
                        let img = document.createElement("img") as HTMLImageElement;
                        img.src = data;
                        img.onload = async () => {
                            let canvas = document.createElement("canvas");
                            canvas.width = 128;
                            canvas.height = 128;
                            let context = canvas.getContext("2d");
                            if (context) {
                                context.drawImage(img, 0, 0);
                            }

                            brick.dispose();
                            this.engine.stopRenderLoop();

                            this._working = false;
                            resolve(canvas);

                            /*
                            var tmpLink = document.createElement( 'a' );
                            tmpLink.download = "test.png";
                            tmpLink.href = canvas.toDataURL();  
                            
                            document.body.appendChild( tmpLink );
                            tmpLink.click(); 
                            document.body.removeChild( tmpLink );
                            */
                        }
                    }
                );
            });
        });
    }
}