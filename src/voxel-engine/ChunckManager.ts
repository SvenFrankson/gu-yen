import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Terrain } from "./Terrain";
import { Chunck } from "./Chunck";

class ChunckRedrawRequest {

    constructor(
        public chunck: Chunck,
        public callback?: () => void,
        public info: string = ""
    ) {

    }
}

interface IChunckManagerProperties {
    scene?: Scene,
    terrain: Terrain,
    fullRenderMode?: boolean
}

export class ChunckManager {
    
    private _viewpoint: Vector3;
    private _chunckIndex: number = 0;
    public chuncks: UniqueList<Chunck>;
    private _chunckLevelsDistancesSubdivide: number[];
    private _chunckLevelsDistancesCollapse: number[];
    private _chunckLevelsSquareDistancesSubdivide: number[];
    private _chunckLevelsSquareDistancesCollapse: number[];
    public scene: Scene;
    public terrain: Terrain;
    public pause: boolean = false;
    public fullRenderMode: boolean = false;

    public currentGlobalLightUpdate: Chunck;
    public globalLightUpdateRequest: UniqueList<Chunck>;

    public debugRenderDistMesh: Mesh;

    public setShowDebugRenderDist(v: boolean): void {
        if (v && !this.debugRenderDistMesh) {
            this.debugRenderDistMesh = MeshBuilder.CreateCylinder("debugRenderDistMesh", { height: 255, diameter: 2, cap: Mesh.NO_CAP, sideOrientation: Mesh.BACKSIDE });
            this.debugRenderDistMesh.scaling.copyFromFloats(this._distance, 1, this._distance);
            let material = new StandardMaterial("debugRenderDistMaterial");
            material.diffuseColor.copyFromFloats(0, 1, 1);
            material.emissiveColor.copyFromFloats(0, 0.2, 0.2);
            material.specularColor.copyFromFloats(0, 0, 0);
            material.alpha = 0.2;
            this.debugRenderDistMesh.material = material;
        }
        else if (!v && this.debugRenderDistMesh) {
            this.debugRenderDistMesh.dispose();
            delete this.debugRenderDistMesh;
        }
    }

    private _checkDuration: number = 10;
    public get checkDuration(): number {
        return this._checkDuration;
    }

    constructor(
        prop: IChunckManagerProperties
    ) {
        this.scene = prop.scene;
        this.terrain = prop.terrain;
        this.fullRenderMode = prop.fullRenderMode;

        this.setDistance(100)
    }

    private _distance: number = 100;
    public getDistance(): number {
        return this._distance;
    }
    public setDistance(v: number): void {
        this._distance = v;
        if (this.debugRenderDistMesh) {
            this.debugRenderDistMesh.scaling.copyFromFloats(this._distance, 1, this._distance);
        }
        this._chunckLevelsDistancesSubdivide = [];
        this._chunckLevelsDistancesCollapse = [];
        let dSub = this._distance;
        let dCollapse = this._distance + this.terrain.chunckSizeIJ_m;
        for (let i = 0; i < this.terrain.maxLevel; i++) {
            this._chunckLevelsDistancesSubdivide.push(dSub);
            this._chunckLevelsDistancesCollapse.push(dCollapse);
            dSub = dSub * 2;
            dCollapse = dCollapse * 2;
        }
        this._chunckLevelsSquareDistancesSubdivide = this._chunckLevelsDistancesSubdivide.map(v => { return v * v; });
        this._chunckLevelsSquareDistancesSubdivide.push(Infinity);
        this._chunckLevelsSquareDistancesCollapse = this._chunckLevelsDistancesCollapse.map(v => { return v * v; });
        this._chunckLevelsSquareDistancesCollapse.push(Infinity);
    }

    public initialize(): void {
        this._viewpoint = Vector3.Zero();
        this.chuncks = new UniqueList<Chunck>();
        this.globalLightUpdateRequest = new UniqueList<Chunck>();
        this.scene.onBeforeRenderObservable.add(this._update);
    }

    public dispose(): void {
        this.scene.onBeforeRenderObservable.removeCallback(this._update);
    }

    public registerChunck(chunck: Chunck): boolean {
        this.chuncks.push(chunck);
        
        return true;
    }

    public unregisterChunck(chunck: Chunck): boolean {
        return this.chuncks.remove(chunck) != undefined;
    }

    /*
    private _getChunckLevel(currentLevel: number, sqrDistance: number): number {
        let distSub = this._chunckLevelsSquareDistances[currentLevel];
        if (sqrDistance < distSub) {
            return currentLevel - 1;
        }
        let distCollapse = this._chunckLevelsSquareDistances[currentLevel + 2];
        if (sqrDistance > distCollapse) {
            return currentLevel + 1;
        }
        return currentLevel;
    }
    */

    private _getChunckLevelSubdivide(sqrDistance: number): number {
        for (let i = 0; i < this._chunckLevelsSquareDistancesSubdivide.length - 1; i++) {
            if (sqrDistance < this._chunckLevelsSquareDistancesSubdivide[i]) {
                return i;
            }
        }
        return this._chunckLevelsSquareDistancesSubdivide.length - 1;
    }

    private _getChunckLevelCollapse(sqrDistance: number): number {
        for (let i = 0; i < this._chunckLevelsSquareDistancesCollapse.length - 1; i++) {
            if (sqrDistance < this._chunckLevelsSquareDistancesCollapse[i]) {
                return i;
            }
        }
        return this._chunckLevelsSquareDistancesCollapse.length - 1;
    }

    private _doGlobalLightUpdateStep(): void {
        if (!this.currentGlobalLightUpdate || !this.currentGlobalLightUpdate.updatingGlobalLight) {
            let l = this.globalLightUpdateRequest.length;
            let dir1 = Vector3.Zero();
            let dir2 = Vector3.Zero();
            this.globalLightUpdateRequest.sort((c1, c2) => {
                dir1.copyFrom(this._viewpoint).subtractInPlace(c1.barycenter);
                dir1.y = 0;
                let d1 = dir1.lengthSquared();
                dir2.copyFrom(this._viewpoint).subtractInPlace(c2.barycenter);
                dir2.y = 0;
                let d2 = dir2.lengthSquared();

                return d1 - d2;
            })
            for (let i = 0; i < l; i++) {
                let chunck = this.globalLightUpdateRequest.get(i);
                if (chunck.dataInitialized) {
                    this.currentGlobalLightUpdate = chunck;
                    this.globalLightUpdateRequest.remove(this.currentGlobalLightUpdate);
                    this.currentGlobalLightUpdate.startGlobalLight3DTextureComputation();
                    return;
                }
            }
        }
    }

    public requestGlobalLightUpdate(chunck: Chunck): void {
        this.globalLightUpdateRequest.push(chunck);
    }

    public async doFullRender(): Promise<void> {
        if (this.scene.activeCameras && this.scene.activeCameras.length > 0) {
            this._viewpoint.copyFrom(this.scene.activeCameras[0].globalPosition);
        }
        else {
            this._viewpoint.copyFrom(this.scene.activeCamera.globalPosition);
        }
        
        let doneCount = 0;
        let limit = this.terrain.chunckCountIJ * this.terrain.chunckCountIJ
        while (doneCount < Math.max(this.chuncks.length, limit)) {
            this._chunckIndex = (this._chunckIndex + 1) % this.chuncks.length;

            let chunck = this.chuncks.get(this._chunckIndex);
            let dir = this._viewpoint.subtract(chunck.barycenter);
            dir.y = 0;
            
            if (chunck.level > 0) {
                let children = chunck.subdivide();
                if (children) {
                    for (let i = 0; i < children.length; i++) {
                        let childChunck = children[i];
                        await childChunck.redrawMesh();
                    }
                    for (let i = 0; i < chunck.adjacents.length; i++) {
                        let adjacentChunck = chunck.adjacents[i];
                        if (adjacentChunck) {
                            await adjacentChunck.redrawMesh();
                        }
                    }
                    doneCount = 0;
                }
                else {
                    doneCount++;
                }
            }
            else {
                doneCount++;
            }
        }
    }

    private _updating: boolean = false;
    private _update = async () => {
        if (this.pause) {
            return;
        }
        if (this._updating) {
            return;
        }

        this._doGlobalLightUpdateStep();

        if (this.fullRenderMode) {
            return;
        }

        this._updating = true;
        if (this.scene.activeCameras && this.scene.activeCameras.length > 0) {
            this._viewpoint.copyFrom(this.scene.activeCameras[0].globalPosition);
        }
        else {
            this._viewpoint.copyFrom(this.scene.activeCamera.globalPosition);
        }
        if (this.debugRenderDistMesh) {
            this.debugRenderDistMesh.position.copyFrom(this._viewpoint);
        }
        
        let t0 = performance.now();
        let t = t0;
        
        let count = 0;
        while ((t - t0) < this._checkDuration) {
            this._chunckIndex = (this._chunckIndex + 1) % this.chuncks.length;

            let chunck = this.chuncks.get(this._chunckIndex);
            let dir = this._viewpoint.subtract(chunck.barycenter);
            dir.y = 0;
            
            let srqDistance = dir.lengthSquared();
            let computedChunckLevelSubdivide = this._getChunckLevelSubdivide(srqDistance);
            if (chunck.level > computedChunckLevelSubdivide) {
                let children = chunck.subdivide();
                if (children) {
                    count++;
                    for (let i = 0; i < children.length; i++) {
                        let childChunck = children[i];
                        await childChunck.redrawMesh();
                    }
                    for (let i = 0; i < chunck.adjacents.length; i++) {
                        let adjacentChunck = chunck.adjacents[i];
                        if (adjacentChunck) {
                            await adjacentChunck.redrawMesh();
                        }
                    }
                }
            }
            else {
                let computedChunckLevelCollapse = this._getChunckLevelCollapse(srqDistance);
                if (chunck.level <= computedChunckLevelCollapse) {
                    chunck.collapseChildren();
                    count++;
                    await chunck.redrawMesh();
                }
            }

            t = performance.now();
        }

        let newDuration = count * 5;
        newDuration = Math.min(Math.max(1, newDuration), 5);
        this._checkDuration = this._checkDuration * 0.8 + newDuration * 0.2;
        this._updating = false;
    }
}
