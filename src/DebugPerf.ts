import { Scene } from "@babylonjs/core/scene.pure";
import { DebugDisplayFrameValue } from "./DebugDisplayFrameValue";
import { DebugDisplayTextValue } from "./DebugDisplayTextValue";
import { Game } from "./Game";

export class DebugPerf {
    
    private _initialized: boolean = false;
    public get initialized(): boolean {
        return this._initialized;
    }

    public debugContainer: HTMLDivElement | null = null;
    public container: HTMLDivElement | null = null;

    private _frameRate: DebugDisplayFrameValue | null = null;
    private _meshesCount: DebugDisplayTextValue | null = null;
    private _materialsCount: DebugDisplayTextValue | null = null;
    private _trianglesCount: DebugDisplayTextValue | null = null;

    public get scene(): Scene {
        return this.main.scene;
    }

    constructor(public main: Game, private _showLayer: boolean = false) {
        setInterval(() => {
            //this.DEBUG_LogMeshesNames();
        }, 3000);
    }

    public initialize(): void {
        this.debugContainer = document.querySelector("#debug-container");
        if (!this.debugContainer) {
            this.debugContainer = document.createElement("div");
            this.debugContainer.id = "debug-container";
            document.body.appendChild(this.debugContainer);
        }

        this.container = document.querySelector("#debug-terrain-perf");
        if (!this.container) {
            this.container = document.createElement("div");
            this.container.id = "debug-terrain-perf";
            this.container.classList.add("debug", "hidden");
            this.debugContainer.appendChild(this.container);
        }
        
        let frameRateId = "#frame-rate";
        this._frameRate = document.querySelector(frameRateId) as DebugDisplayFrameValue;
        if (!this._frameRate) {
            this._frameRate = document.createElement("debug-display-frame-value") as DebugDisplayFrameValue;
            this._frameRate.id = frameRateId;
            this._frameRate.setAttribute("label", "Frame Rate");
            this._frameRate.setAttribute("min", "0");
            this._frameRate.setAttribute("max", "144");
            this._frameRate.style.outline = "1px solid lime";
            this.container.appendChild(this._frameRate);
        }

        let meshesCountId = "#meshes-count";
        this._meshesCount = document.querySelector(meshesCountId) as DebugDisplayTextValue;
        if (!this._meshesCount) {
            this._meshesCount = document.createElement("debug-display-text-value") as DebugDisplayTextValue;
            this._meshesCount.id = meshesCountId;
            this._meshesCount.setAttribute("label", "Meshes Count");
            this.container.appendChild(this._meshesCount);
        }

        let materialsCountId = "#materials-count";
        this._materialsCount = document.querySelector(materialsCountId) as DebugDisplayTextValue;
        if (!this._materialsCount) {
            this._materialsCount = document.createElement("debug-display-text-value") as DebugDisplayTextValue;
            this._materialsCount.id = materialsCountId;
            this._materialsCount.setAttribute("label", "Materials Count");
            this.container.appendChild(this._materialsCount);
        }

        let trianglesCountId = "#triangles-count";
        this._trianglesCount = document.querySelector(trianglesCountId) as DebugDisplayTextValue;
        if (!this._trianglesCount) {
            this._trianglesCount = document.createElement("debug-display-text-value") as DebugDisplayTextValue;
            this._trianglesCount.id = trianglesCountId;
            this._trianglesCount.setAttribute("label", "Tris Count");
            this.container.appendChild(this._trianglesCount);
        }

        this._initialized = true;
    }

    private _counter: number = 0;
    private _update = () => {
        if (this._frameRate) {
		    this._frameRate.addValue(this.main.engine.getFps());
        }
        if (this._meshesCount) {
            this._meshesCount.setText(this.main.scene.meshes.length.toFixed(0));
        }
        if (this._materialsCount) {
            this._materialsCount.setText(this.main.scene.materials.length.toFixed(0));
        }
        this._counter++;
        if (this._counter > 60) {
            this._counter = 0;
            let globalTriCount = 0;

            this.main.scene.meshes.forEach(mesh => {
                let indices = mesh.getIndices();
                if (indices) {
                    globalTriCount += indices.length / 3;
                }
            })
            if (this._trianglesCount) {
                this._trianglesCount.setText(globalTriCount.toFixed(0));
            }
        }
    }

    public show(): void {
        if (!this.initialized) {
            this.initialize();
        }
        if (this.container) {
            this.container.classList.remove("hidden");
        }
        this.scene.onBeforeRenderObservable.add(this._update);
    }

    public hide(): void {
        if (this.container) {
            this.container.classList.add("hidden");
        }
        this.scene.onBeforeRenderObservable.removeCallback(this._update);
    }

    public DEBUG_LogMeshesNames(): void {
        let meshesNames = this.scene.meshes.map(m => { return m.name; });
        let countedMeshes: { name: string, count: number }[] = [];
        meshesNames.forEach(name => {
            let e = countedMeshes.find(cm => { return cm.name === name; });
            if (e) {
                e.count++;
            }
            else {
                countedMeshes.push({ name: name, count: 1});
            }
        });
        countedMeshes.sort((e1, e2) => { return e2.count - e1.count; });
        console.log("-");
        for (let i = 0; i < 6; i++) {
            let e = countedMeshes[i];
            if (e) {
                console.log(e.count.toFixed(0).padStart(4, "0") + " " + e.name);
            }
        }
        console.log("-");
    }
}