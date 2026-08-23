import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Game } from "../Game";
import { ToonMaterial } from "../ToonMaterial";
import { Polypode } from "./Polypode";
import { KneeMode } from "./Leg";
import { AngleFromToAround, IsFinite, SphereCollider } from "babylonjs-tiaratumgames-tools";
import { ColorizeVertexDataInPlace, GetGLTFMeshDataArray } from "../VertexDataUtils";

class TurtleController {

    public destination: Vector3 = Vector3.Zero();
    public timer: number = Infinity;
    public stop: boolean = false;

    public debug: Mesh;

    constructor(public turtle: Turtle) {
        this.debug = new Mesh("debug");
        //CreateSphereVertexData({ diameter: 0.1 }).applyToMesh(this.debug);
    }

    public updateExplorerDestination(): boolean {
        this.destination = this.turtle.game.player.absolutePosition;
        this.destination.x += (Math.random() - 0.5) * 200;
        this.destination.y += 1;
        this.destination.z += (Math.random() - 0.5) * 200;
        this.debug.position.copyFrom(this.destination);
        
        return true;
    }

    public update(): void {
        if (this.stop) {
            this.turtle.speed = 0;
            this.turtle.rotationSpeed = 0;
            return;
        }

        let dt = this.turtle.getScene().getEngine().getDeltaTime() / 1000;

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

        let dirDestination = this.destination.subtract(this.turtle.position);
        let rightDestination = Vector3.Cross(this.turtle.localNormal, dirDestination);
        this.turtle.targetUp = Vector3.Cross(dirDestination, rightDestination).normalize();
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
        
        this.turtle.speed = distDestination * 0.5;
        this.turtle.speed = Math.max(Math.min(this.turtle.speed, 2), 0);
        let alphaDestination = AngleFromToAround(dirDestination, this.turtle.forward, this.turtle.up);
        this.turtle.rotationSpeed = 0;
        if (alphaDestination > Math.PI / 64) {
            this.turtle.rotationSpeed = - 0.1;
        }
        else if (alphaDestination < - Math.PI / 64) {
            this.turtle.rotationSpeed = 0.1;
        }
    }
}

export class Turtle extends Polypode {

    public controller: TurtleController;
    public destination: Vector3 = Vector3.Zero();

    constructor(public game: Game) {
        super("turtle", {
            size: 40,
            legPairsCount: 2,
            headAnchor: (new Vector3(0, 0.04, 0.25)),
            hipAnchors: [
                new Vector3(0.12, 0.026, -0.217),
                new Vector3(0.037, 0.028, 0.22)
            ],
            footTargets: [
                new Vector3(0.25, -.2, -0.5),
                new Vector3(0.2, -.2, 0.5)
            ],
            footThickness: 0,
            upperLegLength: 0.27,
            lowerLegLength: 0.31,
            legScales: [1.1, 1],
            stepHeight: 0.05,
            stepDuration: 0.2,
            stepSimultaneousMaxCount: 1,
            bodyLocalOffset: new Vector3(0, 0.2, 0),
            bodyWorldOffset: new Vector3(0, - 0.05, 0)
        }, game.scene);
        this.rightLegs[0].kneeMode = KneeMode.Backward;
        this.leftLegs[0].kneeMode = KneeMode.Backward;
        this.rightLegs[1].kneeMode = KneeMode.Outward;
        this.leftLegs[1].kneeMode = KneeMode.Outward;

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
                    if (chunck && chunck.meshes) {
                        this.terrain.push(...chunck.meshes);
                    }
                })
            }
        }

        setInterval(() => {
            if (this.game.terrain) {
                let chunckMeshes = this.game.terrain.getMeshesAtWorldPosition(this.position, 2);
                this.terrain = chunckMeshes ? chunckMeshes : [];
                this.chuncks = chunckMeshes ? chunckMeshes.map(m => m.chunck).filter((c, index, self) => self.indexOf(c) === index) : [];
                console.log(this.terrain);
            }
        }, 500);

        this.controller = new TurtleController(this);

        this.debugColliderMaterial = colliderMaterial;
        this.debugColliderHitMaterial = colliderHitMaterial;

        /*
        let headCollider = new SphereCollider(new Vector3(0, 0, 0.05), 0.12, this.head);
        let bodyCollider = new SphereCollider(Vector3.Zero(), 0.13, this.body);
        let assCollider = new SphereCollider(new Vector3(0, 0, - 0.2), 0.14, this.body);
        this.bodyColliders.push(headCollider, bodyCollider, assCollider);
        */

        this.updateBodyCollidersMeshes();

        this.debugPovMaterial = povMaterial;
        this.showCollisionDebug = true;
        this.showPOVDebug = true;

        if (this.showCollisionDebug) {
            let cross = MeshBuilder.CreateLineSystem(
                "cross",
                {
                    lines: [
                        [new Vector3(0, 0, 0), new Vector3(0, 0, 1)],
                        [new Vector3(0, 0, 0), new Vector3(0, 1, 0)],
                        [new Vector3(-1, 0, 0), new Vector3(1, 0, 0)],
                    ]
                },
                this.getScene()
            );
            cross.parent = this;
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

        datas?.forEach(d => {
            ColorizeVertexDataInPlace(d.vertexData, color);
        });

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

        this.body.material = droneMaterial;
        this.head.material = droneMaterial;
        this.antennas[0].material = droneMaterial;
        this.antennas[1].material = droneMaterial;
    }

    private _updateDrone = () => {
        this.controller.update();
    }
}