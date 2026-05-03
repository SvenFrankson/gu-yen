import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Game } from "../Game";

export class Minimap extends HTMLElement {

    public background?: HTMLImageElement;
    public treesLayer?: HTMLImageElement;
    public currentPositionMarker?: HTMLDivElement;

    public game?: Game;

    public setGame(game: Game): void {
        this.game = game;
        this.game.scene.onBeforeRenderObservable.add(this._update);
    }

    constructor() {
        super();
    }

    public connectedCallback() {
        this.style.position = "fixed";
        this.style.left = "10px";
        this.style.top = "10px";
        this.style.width = "512px";
        this.style.height = "512px";
        
        this.background = document.createElement("img");
        this.background.src = "heightMap_-20_150.png";
        this.background.style.width = "100%";
        this.background.style.height = "100%";
        this.background.style.position = "absolute";
        this.background.style.left = "0px";
        this.background.style.bottom = "0px";
        this.background.style.zIndex = "10";
        this.appendChild(this.background);
        
        this.treesLayer = document.createElement("img");
        this.treesLayer.src = "trees_map.png";
        this.treesLayer.style.width = "100%";
        this.treesLayer.style.height = "100%";
        this.treesLayer.style.position = "absolute";
        this.treesLayer.style.left = "0px";
        this.treesLayer.style.bottom = "0px";
        this.treesLayer.style.zIndex = "20";
        this.appendChild(this.treesLayer);

        this.currentPositionMarker = document.createElement("div");
        this.currentPositionMarker.style.width = "4px";
        this.currentPositionMarker.style.height = "4px";
        this.currentPositionMarker.style.backgroundColor = "red";
        this.currentPositionMarker.style.position = "absolute";
        this.currentPositionMarker.style.zIndex = "100";
        this.appendChild(this.currentPositionMarker);

        this.onclick = (e) => {
            if (this.game && this.game.camera && this.game.terrain) {
                let rect = this.getBoundingClientRect();
                let xNorm = (e.clientX - rect.left) / rect.width;
                let zNorm = 1 - (e.clientY - rect.top) / rect.height;
                let x = xNorm * this.game.terrain.terrainSizeIJ_m - this.game.terrain.halfTerrainSizeIJ_m;
                let z = zNorm * this.game.terrain.terrainSizeIJ_m - this.game.terrain.halfTerrainSizeIJ_m;
                this.game.camera.targetPosition = new Vector3(x, this.game.camera.position.y, z);
            }
        };
    }

    private _update = () => {
        if (this.currentPositionMarker) {
            if (this.game && this.game.camera && this.game.terrain) {
                let position = this.game.camera.position;
                let x = position.x / this.game.terrain.halfTerrainSizeIJ_m * 256 + 256;
                let z = position.z / this.game.terrain.halfTerrainSizeIJ_m * 256 + 256;
                this.currentPositionMarker.style.left = (x - 2) + "px";
                this.currentPositionMarker.style.bottom = (z - 2) + "px";
            }
        }
    }
}