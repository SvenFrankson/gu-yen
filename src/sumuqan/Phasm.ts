import { Vector3, Mesh, Color3, CreateBoxVertexData, Quaternion, StandardMaterial } from "@babylonjs/core";
import { Game } from "../Game";
import { ToonMaterial } from "../ToonMaterial";
import { Polypode } from "./Polypode";
import { KneeMode } from "./Leg";
import { AngleFromToAround, IsFinite, SphereCollider } from "babylonjs-tiaratumgames-tools";
import { GetGLTFMeshDataArray } from "../VertexDataUtils";

class PhasmController {

    public destination: Vector3 = Vector3.Zero();
    public timer: number = Infinity;
    public stop: boolean = false;

    public debug: Mesh;

    constructor(public phasm: Phasm) {
        this.debug = new Mesh("debug");
        //CreateSphereVertexData({ diameter: 0.1 }).applyToMesh(this.debug);
    }

    public updateExplorerDestination(): boolean {
        this.destination = this.phasm.game.player.absolutePosition;
        this.debug.position.copyFrom(this.destination);
        
        return true;
    }

    public update(): void {
        if (this.stop) {
            this.phasm.speed = 0;
            this.phasm.rotationSpeed = 0;
            return;
        }

        let dt = this.phasm.getScene().getEngine().getDeltaTime() / 1000;

        this.timer += dt;
        if (this.timer > 30) {
            if (this.updateExplorerDestination()) {
                this.timer = 0;
                return;
            }
        }

        if (!this.destination || !IsFinite(this.destination)) {
            if (this.updateExplorerDestination()) {
                this.timer = 0;
            }
            return;
        }

        let dirDestination = this.destination.subtract(this.phasm.position);
        let distDestination = dirDestination.length();
        if (distDestination < 0.4) {
            if (this.updateExplorerDestination()) {
                this.timer = 0;
                if (Math.random() > 0.5) {
                    this.stop = true;
                    setTimeout(() => {
                        this.stop = false;
                    }, Math.random() * 15000);
                }
                return;
            }
        }
        
        this.phasm.speed = distDestination * 0.5;
        this.phasm.speed = Math.max(Math.min(this.phasm.speed, 1 * this.phasm.size), 0);
        let alphaDestination = AngleFromToAround(dirDestination, this.phasm.forward, this.phasm.up);
        this.phasm.rotationSpeed = 0;
        if (alphaDestination > Math.PI / 64) {
            this.phasm.rotationSpeed = - 0.25;
        }
        else if (alphaDestination < - Math.PI / 64) {
            this.phasm.rotationSpeed = 0.25;
        }
    }
}

export class Phasm extends Polypode {

    public controller: PhasmController;
    public destination: Vector3 = Vector3.Zero();

    constructor(public game: Game) {
        super("phasm", {
            size: 4,
            legPairsCount: 3,
            headAnchor: (new Vector3(0, 0.04, 0.25)),
            hipAnchors: [
                new Vector3(0.12, 0.026, -0.217),
                new Vector3(0.08, 0, 0),
                new Vector3(0.037, 0.028, 0.22)
            ],
            footTargets: [
                new Vector3(0.25, -.2, -0.5),
                new Vector3(0.32, -.2, 0),
                new Vector3(0.15, -.2, 0.5)
            ],
            footThickness: 0,
            upperLegLength: 0.27,
            lowerLegLength: 0.31,
            legScales: [1.1, 0.9, 1],
            stepHeight: 0.2,
            stepDuration: 0.2,
            bodyWorldOffset: new Vector3(0, - 0.05, 0),
            antennaAnchor: new Vector3(0.045, 0.041, 0.065),
            antennaLength: 0.5,
            scorpionTailProps: {
                length: 7,
                dist: 0.11,
                distGeometricFactor: 0.9,
                anchor: new Vector3(0, 0.035, - 0.28)
            }
        });
        this.rightLegs[0].kneeMode = KneeMode.Backward;
        this.leftLegs[0].kneeMode = KneeMode.Backward;
        this.rightLegs[2].kneeMode = KneeMode.Outward;
        this.leftLegs[2].kneeMode = KneeMode.Outward;

        let povMaterial = new StandardMaterial("debug-pov-material", this.game.scene);
        povMaterial.diffuseColor = new Color3(0.5, 0.5, 1);
        povMaterial.alpha = 0.4;
        povMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
        
        let colliderMaterial = new StandardMaterial("body", this.game.scene);
        colliderMaterial.diffuseColor = new Color3(0.5, 1, 0.5);
        colliderMaterial.alpha = 0.4;
        colliderMaterial.specularColor = new Color3(0.5, 0.5, 0.5);

        let colliderHitMaterial = new StandardMaterial("body", this.game.scene);
        colliderHitMaterial.diffuseColor = new Color3(1, 0.5, 0.5);
        colliderHitMaterial.alpha = 0.4;
        colliderHitMaterial.specularColor = new Color3(0.5, 0.5, 0.5);

        this.terrain = [];
        if (this.game.player) {
            if (this.game.player.chuncks) {
                this.game.player.chuncks.forEach(chunck => {
                    if (chunck && chunck.mesh) {
                        this.terrain.push(chunck.mesh);
                    }
                })
            }
        }

        setInterval(() => {
            if (this.game.terrain) {
                let ijk = this.game.terrain.getChunckAndIJKAtPos(this.position, 0, false);
                if (ijk) {
                    let chunck = ijk.chunck;
                    this.terrain = [chunck.mesh!];
                    let i0 = ijk.ijk.i < this.game.terrain.chunckLengthIJ * 0.5 ? -1 : 0;
                    let j0 = ijk.ijk.j < this.game.terrain.chunckLengthIJ * 0.5 ? -1 : 0;
                    for (let i = i0; i <= i0 + 1; i++) {
                        for (let j = j0; j <= j0 + 1; j++) {
                            if (i != 0 || j != 0) {
                                let c = this.game.terrain.getChunck(chunck.level, chunck.iPos + i, chunck.jPos + j);
                                if (c) {
                                    this.terrain.push(c.mesh!);
                                }
                            }
                        }
                    }
                }
            }
            console.log(this.terrain.length);
        }, 500);

        this.controller = new PhasmController(this);

        this.debugColliderMaterial = colliderMaterial;
        this.debugColliderHitMaterial = colliderHitMaterial;

        let headCollider = new SphereCollider(new Vector3(0, 0, 0.1), 0.15, this.head);
        let assCollider = new SphereCollider(new Vector3(0, 0, - 0.2), 0.2, this.body);
        this.bodyColliders.push(headCollider, assCollider);

        let tailEndCollider = new SphereCollider(Vector3.Zero(), 0.15, this.tail!.tailSegments[6]);
        this.tail!.tailCollider = tailEndCollider;

        this.updateBodyCollidersMeshes();

        this.debugPovMaterial = povMaterial;
        this.showCollisionDebug = true;
        this.showPOVDebug = true;

        if (this.showCollisionDebug) {
            CreateBoxVertexData({ width: 0.1, height: 0.8, depth: 0.1 }).applyToMesh(this);
            this.material = colliderHitMaterial;
        }
    }

    public async initialize(): Promise<void> {
        await super.initialize();
        this.rotationQuaternion = Quaternion.Identity();
        this.getScene().onBeforeRenderObservable.add(this._updateDrone);
    }

    public async instantiate(): Promise<void> {
        let datas = await GetGLTFMeshDataArray("meshes/phasm.gltf", this.getScene());
        console.log(datas);
        datas?.splice(0, 1);
        datas?.sort((d1, d2) => {
            return parseInt(d1.name.split("-")[0]) - parseInt(d2.name.split("-")[0]);
        });

        let droneMaterial = new ToonMaterial("drone-material", this.getScene());
        let color = Color3.FromHexString("#9e6120");
        color.r *= 0.7 + 0.6 * Math.random();
        color.g *= 0.7 + 0.6 * Math.random();
        color.b *= 0.7 + 0.6 * Math.random();
        //droneMaterial.setDiffuse(color);
        //droneMaterial.setUseVertexColor(false);

        this.legs.forEach(leg => {
            datas![0].vertexData.applyToMesh(leg.upperLeg);
            datas![1].vertexData.applyToMesh(leg.lowerLeg);
            leg.upperLeg.material = droneMaterial;
            leg.lowerLeg.material = droneMaterial;
        })

        datas![2].vertexData.applyToMesh(this.body);
        datas![3].vertexData.applyToMesh(this.head);
        datas![11].vertexData.applyToMesh(this.antennas[0]);
        datas![11].vertexData.applyToMesh(this.antennas[1]);

        for (let i = 0; i < 7; i++) {
            datas![4 + i].vertexData.applyToMesh(this.tail!.tailSegments[i]);
            this.tail!.tailSegments[i].material = droneMaterial;
        }

        this.body.material = droneMaterial;
        this.head.material = droneMaterial;
        this.antennas[0].material = droneMaterial;
        this.antennas[1].material = droneMaterial;
    }

    private _updateDrone = () => {
        this.controller.update();
    }
}