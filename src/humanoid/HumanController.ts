import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Game } from "../Game";
import { Humanoid } from "./Humanoid";
import { AngleFromToAround, GetGLTFMeshDataArray, IsFinite, QuaternionFromZYAxis, RotateVertexDataInPlace, SphereCollider } from "babylonjs-tiaratumgames-tools";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/core";
import { Axis, Space, VertexData } from "@babylonjs/core";
import { ChunckDataGeneratorFromManager } from "../voxel-engine/TerrainGen/ChunkDataManager";
import { ChunckDataGeneratorDataSets } from "../voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";
import { HumanNames, HumanoidProp, MoveMode } from "./HumanoidProp";
import { easeInOutSine, easeInSine, easeOutSine } from "../Easing";

var HumanNameIndex: number = 0;

class HumanController {

    public destination: Vector3 = Vector3.Zero();
    public timer: number = Infinity;
    public stop: boolean = false;

    public debug: Mesh;

    constructor(public human: Human) {
        this.debug = new Mesh("debug");
        //CreateSphereVertexData({ diameter: 0.1 }).applyToMesh(this.debug);
    }

    public async updateExplorerDestination(): Promise<boolean> {
        this.destination = this.human.game.player.position.add(new Vector3(Math.random() * 20 - 10, 0, Math.random() * 20 - 10));
        if (this.human.game.terrain!.chunckDataGenerator instanceof ChunckDataGeneratorFromManager && this.human.game.terrain!.chunckDataGenerator.manager.generator instanceof ChunckDataGeneratorDataSets) {
            let ijk = this.human.game.terrain!.worldPosToGlobalIJK(this.destination);
            let height = await this.human.game.terrain!.chunckDataGenerator.manager.generator.asyncEvaluateHeight(ijk.i, ijk.j);
            height *= this.human.game.terrain!.blockSizeK_m;
            this.destination.y = height;
        }
        
        return true;
    }

    public update(): void {
        if (this.stop) {
            this.human.targetSpeed = 0;
            this.human.rotationSpeed = 0;
            return;
        }

        let dt = this.human.getScene().getEngine().getDeltaTime() / 1000;

        this.timer += dt;
        if (this.timer > 30) {
            this.updateExplorerDestination();
            this.timer = 0;
            return;
        }

        if (!this.destination || !IsFinite(this.destination)) {
            this.updateExplorerDestination();
            this.timer = 0;
            return;
        }

        let dirDestination = this.destination.subtract(this.human.position);
        let rightDestination = Vector3.Cross(Axis.Y, dirDestination);
        this.human.targetUp = Vector3.Cross(dirDestination, rightDestination).normalize();
        let distDestination = dirDestination.length();
        if (distDestination < 0.4) {
            this.updateExplorerDestination();
            this.timer = 0;
            if (Math.random() > 0.5) {
                this.stop = true;
                setTimeout(() => {
                    this.stop = false;
                }, Math.random() * 5000);
            }
            return;
        }
        
        this.human.targetSpeed = (distDestination) * 0.5 ;
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

    constructor(name: string, public game: Game, props: HumanoidProp) {
        super(name, props, game.scene);
        
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

        this.showCollisionDebug = true;

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

    public bodyVertexData: VertexData | null = null;
    public torsoVertexData: VertexData | null = null;
    public upperLegVertexData: VertexData | null = null;
    public lowerLegVertexData: VertexData | null = null
    public footVertexData: VertexData | null = null;
    public upperArmVertexData: VertexData | null = null;
    public lowerArmVertexData: VertexData | null = null;
    public handVertexData: VertexData | null = null

    public static async FactoryInstantiate(game: Game): Promise<Human | null> {
        let dataArray = await GetGLTFMeshDataArray("meshes/heva-robot-model.gltf", game.scene);
        if (dataArray && dataArray.length) {
            let body = dataArray.find(d => d.name === "0-body")!;
            let upperLeg = dataArray.find(d => d.name === "1-upper-leg")!;
            let lowerLeg = dataArray.find(d => d.name === "2-lower-leg")!;
            let foot = dataArray.find(d => d.name === "3-foot")!;
            let torso = dataArray.find(d => d.name === "4-torso")!;
            let upperArm = dataArray.find(d => d.name === "5-upper-arm")!;
            let lowerArm = dataArray.find(d => d.name === "6-lower-arm")!;
            let hand = dataArray.find(d => d.name === "7-hand")!;
            
            let footThickness = foot.position.y;
            let footTarget = foot.position.clone();
            footTarget.y = 0;

            let hipAnchor = upperLeg.position.subtract(body.position);
            let shoulderAnchor = upperArm.position.subtract(torso.position);
            let torsoAnchor = torso.position.subtract(body.position);
            let upperLegLength = lowerLeg.position.subtract(upperLeg.position).length();
            let lowerLegLength = foot.position.subtract(lowerLeg.position).length();
            let upperArmLength = lowerArm.position.subtract(upperArm.position).length();
            let lowerArmLength = hand.position.subtract(lowerArm.position).length();

            let prop = new HumanoidProp();
            prop.hipAnchor = hipAnchor;
            prop.shoulderAnchor = shoulderAnchor;
            prop.footTarget = footTarget;
            prop.headAnchor = (new Vector3(0, 0.8, 0.1));
            prop.torsoAnchor = torsoAnchor;
            prop.footThickness = footThickness;
            prop.upperLegLength = upperLegLength;
            prop.lowerLegLength = lowerLegLength;
            prop.upperArmLength = upperArmLength;
            prop.lowerArmLength = lowerArmLength;
            prop.handLength = 0.2;

            prop.walkStyle[MoveMode.Walk].bootyShakiness = 0.2;
            prop.walkStyle[MoveMode.Walk].stepHeight = 0.15;
            prop.walkStyle[MoveMode.Walk].stepDuration = 0.8;
            prop.walkStyle[MoveMode.Walk].stepFSkip = 1;
            prop.walkStyle[MoveMode.Walk].handAmplitude = 0.7;
            prop.walkStyle[MoveMode.Walk].handBodyDY = -0.1;
            prop.walkStyle[MoveMode.Walk].stepEasing = easeInOutSine;
            prop.walkStyle[MoveMode.Walk].stepEasingFactor = 0.5;
            prop.walkStyle[MoveMode.Walk].bodyOffsetUpdate = (fSpeed: number, deltaFoot: Vector3, bodyOffsetRef: Vector3) => {
                let maxOffsetHeight = prop.totalLegLength - prop.rightHipAnchor.y;
                let ll = prop.totalLegLengthSquared;
                let df = deltaFoot.scale(0.5).lengthSquared();
                bodyOffsetRef.copyFromFloats(0, 0.5 * maxOffsetHeight, 0);
                if (ll > df) {
                    bodyOffsetRef.y = Math.sqrt(ll - df);
                    bodyOffsetRef.y = Math.min(bodyOffsetRef.y, maxOffsetHeight) + 0.05 * fSpeed;
                }
                bodyOffsetRef.z = 0.1 * fSpeed;
            }

            prop.walkStyle[MoveMode.Run].bootyShakiness = 0.2;
            prop.walkStyle[MoveMode.Run].stepHeight = 0.4;
            prop.walkStyle[MoveMode.Run].stepDuration = 0.6;
            prop.walkStyle[MoveMode.Run].stepFSkip = 0.8;
            prop.walkStyle[MoveMode.Run].handAmplitude = 0.7;
            prop.walkStyle[MoveMode.Run].handBodyDY = 0.1;
            prop.walkStyle[MoveMode.Run].stepEasing = easeOutSine;
            prop.walkStyle[MoveMode.Run].stepEasingFactor = 0.2;
            prop.walkStyle[MoveMode.Run].bodyOffsetUpdate = (fSpeed: number, deltaFoot: Vector3, bodyOffsetRef: Vector3) => {
                let maxOffsetHeight = prop.totalLegLength - prop.rightHipAnchor.y;
                let ll = prop.totalLegLengthSquared;
                let df = deltaFoot.scale(0.5).lengthSquared();
                bodyOffsetRef.copyFromFloats(0, 0.5 * maxOffsetHeight, 0);
                if (ll > df) {
                    bodyOffsetRef.y = Math.sqrt(ll - df);
                    bodyOffsetRef.y = Math.min(bodyOffsetRef.y, maxOffsetHeight - 0.2 * fSpeed);
                }
                bodyOffsetRef.z = 0.3 * fSpeed;
            }

            let rSteps = Math.floor(Math.random() * 6) + 1;
            for (let n = 0; n < rSteps; n++) {
                prop.randomize();
            }

            let human = new Human(HumanNames[HumanNameIndex++ % HumanNames.length], game, prop);
            human.moveMode = MoveMode.Run;
            if (Math.random() > 0.5) {
                human.prop.maxSpeed = 1;
                human.moveMode = MoveMode.Walk;
            }

            human.bodyVertexData = body.vertexData;
            human.torsoVertexData = torso.vertexData;

            let upperArmForward = lowerArm.position.subtract(upperArm.position).normalize();
            let upperArmQ = QuaternionFromZYAxis(upperArmForward, Vector3.Forward()).invertInPlace();
            human.upperArmVertexData = RotateVertexDataInPlace(upperArm.vertexData, upperArmQ);

            let lowerArmForward = hand.position.subtract(lowerArm.position).normalize();
            let lowerArmQ = QuaternionFromZYAxis(lowerArmForward, Vector3.Forward()).invertInPlace();
            human.lowerArmVertexData = RotateVertexDataInPlace(lowerArm.vertexData, lowerArmQ);

            let upperLegForward = lowerLeg.position.subtract(upperLeg.position).normalize();
            let upperLegQ = QuaternionFromZYAxis(upperLegForward, Vector3.Forward()).invertInPlace();
            human.upperLegVertexData = RotateVertexDataInPlace(upperLeg.vertexData, upperLegQ);

            let lowerLegForward = foot.position.subtract(lowerLeg.position).normalize();
            let lowerLegQ = QuaternionFromZYAxis(lowerLegForward, Vector3.Forward()).invertInPlace();
            human.lowerLegVertexData = RotateVertexDataInPlace(lowerLeg.vertexData, lowerLegQ);

            human.footVertexData = foot.vertexData;
            
            let handForward = Axis.X;
            let handQ = QuaternionFromZYAxis(handForward, Vector3.Up()).invertInPlace();
            human.handVertexData = RotateVertexDataInPlace(hand.vertexData, handQ);

            human.initialize();
            await human.instantiate();
            return human;
        }
        return null;
    }

    private _updateDrone = () => {
        this.controller.update();
    }
}