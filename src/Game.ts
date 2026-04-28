import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { MyCamera } from "./MyCamera";
import "@babylonjs/core/Culling/ray";

export class Game {

    public engine: Engine;
    public scene: Scene;
    public camera: MyCamera;

    constructor(public canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true)
        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(0, 0, 0, 1);
        this.camera = new MyCamera(this);

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