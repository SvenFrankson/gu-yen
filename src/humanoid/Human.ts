import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Game } from "../Game";
import { Humanoid } from "./Humanoid";
import { AngleFromToAround, IsFinite, SphereCollider } from "babylonjs-tiaratumgames-tools";

class HumanController {

    public destination: Vector3 = Vector3.Zero();
    public timer: number = Infinity;
    public stop: boolean = false;

    public debug: Mesh;

    constructor(public human: Human) {
        this.debug = new Mesh("debug");
        //CreateSphereVertexData({ diameter: 0.1 }).applyToMesh(this.debug);
    }

    public updateExplorerDestination(): boolean {
        this.destination = this.human.game.player.absolutePosition;
        this.destination.y += 1;
        this.debug.position.copyFrom(this.destination);
        
        return true;
    }

    public update(): void {
        if (this.stop) {
            this.human.speed = 0;
            this.human.rotationSpeed = 0;
            return;
        }

        let dt = this.human.getScene().getEngine().getDeltaTime() / 1000;

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

        let dirDestination = this.destination.subtract(this.human.position);
        let rightDestination = Vector3.Cross(this.human.localNormal, dirDestination);
        this.human.targetUp = Vector3.Cross(dirDestination, rightDestination).normalize();
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
        
        this.human.speed = (distDestination - 3) * 0.5 ;
        this.human.speed = Math.max(Math.min(this.human.speed, 1), 0);
        let alphaDestination = AngleFromToAround(dirDestination, this.human.forward, this.human.up);
        this.human.rotationSpeed = 0;
        if (alphaDestination > Math.PI / 64) {
            this.human.rotationSpeed = - 1;
        }
        else if (alphaDestination < - Math.PI / 64) {
            this.human.rotationSpeed = 1;
        }
    }
}

export class Human extends Humanoid {

    public controller: HumanController;
    public destination: Vector3 = Vector3.Zero();

    constructor(public game: Game) {
        super("human", {
            size: 1,
            headAnchor: (new Vector3(0, 0.6, 0.1)),
            footThickness: 0,
            upperLegLength: 0.5,
            lowerLegLength: 0.5,
            stepHeight: 0.2,
            stepDuration: 0.5,
            stepSimultaneousMaxCount: 3,
            bodyLocalOffset: new Vector3(0, 0.6, 0),
            bodyWorldOffset: new Vector3(0, - 0.1, 0)
        }, game.scene);

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
                let chunckMeshes = this.game.terrain.getMeshesAtWorldPosition(this.position);
                this.terrain = chunckMeshes ? chunckMeshes : [];
                this.chuncks = chunckMeshes ? chunckMeshes.map(m => m.chunck).filter((c, index, self) => self.indexOf(c) === index) : [];
            }
        }, 500);

        this.controller = new HumanController(this);

        this.debugColliderMaterial = colliderMaterial;
        this.debugColliderHitMaterial = colliderHitMaterial;

        let bodyCollider = new SphereCollider(Vector3.Zero(), 0.13, this.body);
        this.bodyColliders.push(bodyCollider);

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
        console.log("human initialized");
    }

    public async instantiate(): Promise<void> {
        await super.instantiate();
        console.log("human instantiated");
    }

    private _updateDrone = () => {
        this.controller.update();
    }
}