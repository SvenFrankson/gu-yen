import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Game } from "../Game";
import { ChunckDataGeneratorDataSets } from "../voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";

export class Minimap extends HTMLElement {

    public size: number = 256;

    public background?: HTMLImageElement;
    public treesLayer?: HTMLImageElement;
    public currentPositionMarker?: HTMLDivElement;
    public coordinates?: HTMLDivElement;

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
        this.style.width = this.size.toFixed(0) + "px";
        this.style.height = this.size.toFixed(0) + "px";
        this.style.border = "2px solid lime";
        this.style.borderRadius = "10px";
        this.style.overflow = "hidden";
        
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

        this.coordinates = document.createElement("div");
        this.coordinates.style.position = "absolute";
        this.coordinates.style.right = "10px";
        this.coordinates.style.bottom = "0px";
        this.coordinates.style.zIndex = "200";
        this.coordinates.style.color = "lime";
        this.coordinates.style.fontFamily = "monospace";
        this.coordinates.innerHTML = "coordinates";
        this.appendChild(this.coordinates);

        this.onclick = async (e) => {
            if (this.game && this.game.camera && this.game.terrain) {
                let rect = this.getBoundingClientRect();
                let xNorm = (e.clientX - rect.left) / rect.width;
                let zNorm = 1 - (e.clientY - rect.top) / rect.height;
                let x = xNorm * this.game.terrain.terrainSizeIJ_m - this.game.terrain.halfTerrainSizeIJ_m;
                let z = zNorm * this.game.terrain.terrainSizeIJ_m - this.game.terrain.halfTerrainSizeIJ_m;
                let ijk = this.game.terrain.worldPosToGlobalIJK(new Vector3(x, 0, z));
                if (ijk) {
                    console.log(ijk);
                    if (this.game.terrain.chunckDataGenerator instanceof ChunckDataGeneratorDataSets) {
                        let height = await this.game.terrain.chunckDataGenerator.asyncEvaluateHeight(ijk.i, ijk.j);
                        height *= this.game.terrain.blockSizeK_m;
                        console.log("height: " + height);
                        this.game.player.position = new Vector3(x, height + 4, z);
                        this.game.player.targetPosition = this.game.player.position.clone();
                    }
                }
            }
        };
    }

    private _update = () => {
        if (this.currentPositionMarker) {
            if (this.game && this.game.camera && this.game.terrain) {
                let position = this.game.camera.position;
                let x = position.x / this.game.terrain.halfTerrainSizeIJ_m * this.size * 0.5 + this.size * 0.5;
                let z = position.z / this.game.terrain.halfTerrainSizeIJ_m * this.size * 0.5 + this.size * 0.5;
                this.currentPositionMarker.style.left = (x - 2) + "px";
                this.currentPositionMarker.style.bottom = (z - 2) + "px";

                let latlong = this.game.geoConverter.vector3ToLatLong(position);
                this.coordinates!.innerHTML = "N" + latlong.lat.toFixed(5) + " W" + Math.abs(latlong.long).toFixed(5) + ", " + position.y.toFixed(1) + "m";
            }
        }
    }
}