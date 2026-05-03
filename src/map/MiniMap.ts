import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Game } from "../Game";

export class Minimap extends HTMLElement {

    public background?: HTMLImageElement;
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
        this.style.width = "256px";
        this.style.height = "256px";
        
        this.background = document.createElement("img");
        this.background.src = "heightMap_Blue.png";
        this.background.style.width = "100%";
        this.background.style.height = "100%";
        this.background.style.position = "absolute";
        this.background.style.left = "0px";
        this.background.style.bottom = "0px";
        this.background.style.zIndex = "100";
        this.appendChild(this.background);

        this.currentPositionMarker = document.createElement("div");
        this.currentPositionMarker.style.width = "4px";
        this.currentPositionMarker.style.height = "4px";
        this.currentPositionMarker.style.backgroundColor = "red";
        this.currentPositionMarker.style.position = "absolute";
        this.currentPositionMarker.style.zIndex = "101";
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
                let x = position.x / this.game.terrain.halfTerrainSizeIJ_m * 128 + 128;
                let z = position.z / this.game.terrain.halfTerrainSizeIJ_m * 128 + 128;
                this.currentPositionMarker.style.left = (x - 2) + "px";
                this.currentPositionMarker.style.bottom = (z - 2) + "px";
            }
        }
    }
}