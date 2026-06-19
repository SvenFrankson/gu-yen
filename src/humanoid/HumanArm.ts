import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { Humanoid } from "./Humanoid";
import { Scene } from "@babylonjs/core/scene.pure";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.pure";
import { CloneVertexData, ColorizeVertexDataInPlace, CreateBeveledBoxVertexData, ForceDistanceFromOriginInPlace, MirrorXVertexDataInPlace, QuaternionFromYZAxisToRef, QuaternionFromZYAxisToRef, TranslateVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Human } from "./HumanController";
import { HumanoidProp } from "./HumanoidProp";

export class HumanArm extends Mesh {

    public get prop(): HumanoidProp {
        return this.humanoid.prop;
    }

    public shoulderWorldPosition: Vector3 = Vector3.Zero();
    public isLeft: boolean = false;

    public get totalLength(): number {
        return this.prop.upperArmLength + this.prop.lowerArmLength;
    }
    public get totalLengthSquared(): number {
        return this.totalLength * this.totalLength;
    }

    public upperArm: Mesh;
    public lowerArm: Mesh;
    public hand: Mesh;

    public handTarget: Vector3 = Vector3.Zero();
    public handForward: Vector3 = Vector3.Forward();
    public handUp: Vector3 = Vector3.Up();
    private _elbowTarget: Vector3 = Vector3.Zero();

    public grounded: boolean = true;

    private _tmpZ: Vector3 = Vector3.Forward();

    constructor(public humanoid: Humanoid, isLeft: boolean) {
        super("arm", humanoid.getScene());
        this.isLeft = isLeft;
        //this.upperArm = new Mesh("upperArm", humanoid.getScene());
        this.upperArm = new Mesh("upperArm", humanoid.getScene());
        this.upperArm.material = this.humanoid.material;
        this.upperArm.rotationQuaternion = Quaternion.Identity();
        this.lowerArm = new Mesh("lowerArm", humanoid.getScene());
        this.lowerArm.material = this.humanoid.material;
        this.lowerArm.rotationQuaternion = Quaternion.Identity();
        this.hand = new Mesh("hand", humanoid.getScene());
        this.hand.material = this.humanoid.material;
        this.hand.rotationQuaternion = Quaternion.Identity();
    }

    public async instantiate(): Promise<void> {
        if (this.humanoid instanceof Human) {
            if (this.isLeft) {
                MirrorXVertexDataInPlace(CloneVertexData(this.humanoid.upperArmVertexData!)).applyToMesh(this.upperArm);
                MirrorXVertexDataInPlace(CloneVertexData(this.humanoid.lowerArmVertexData!)).applyToMesh(this.lowerArm);
                MirrorXVertexDataInPlace(CloneVertexData(this.humanoid.handVertexData!)).applyToMesh(this.hand);
            } else {
                this.humanoid.upperArmVertexData!.applyToMesh(this.upperArm);
                this.humanoid.lowerArmVertexData!.applyToMesh(this.lowerArm);
                this.humanoid.handVertexData!.applyToMesh(this.hand);
            }
        }
    }

    public update(): void {
        this._elbowTarget.copyFrom(this.shoulderWorldPosition).addInPlace(this.handTarget).scaleInPlace(0.5).subtractInPlace(this.humanoid.forward).addInPlace(this.humanoid.right.scale(this.isLeft ? - 0.5 : 0.5));
        let wristTarget = this.handForward.scale(this.prop.handLength).add(this.handTarget);
        
        for (let n = 0; n < 3; n++) {
            ForceDistanceFromOriginInPlace(this._elbowTarget, wristTarget, this.prop.lowerArmLength);
            ForceDistanceFromOriginInPlace(this._elbowTarget, this.shoulderWorldPosition, this.prop.upperArmLength);
        }

        this.hand.position.copyFrom(wristTarget);
        ForceDistanceFromOriginInPlace(this.hand.position, this._elbowTarget, this.prop.lowerArmLength);
        this.upperArm.position.copyFrom(this.shoulderWorldPosition);
        this.lowerArm.position.copyFrom(this._elbowTarget);

        this._tmpZ.copyFrom(this._elbowTarget).subtractInPlace(this.shoulderWorldPosition);
        QuaternionFromZYAxisToRef(this._tmpZ, this.humanoid.forward, this.upperArm.rotationQuaternion!);
        
        this._tmpZ.copyFrom(this.hand.position).subtractInPlace(this._elbowTarget);
        QuaternionFromZYAxisToRef(this._tmpZ, this.humanoid.forward, this.lowerArm.rotationQuaternion!);
        
        this.handForward.copyFrom(this.handTarget).subtractInPlace(this._elbowTarget);
        this.handUp.copyFrom(this.humanoid.right);
        if (this.isLeft) {
            this.handUp.scaleInPlace(-1);
        }
        QuaternionFromZYAxisToRef(this.handForward, this.handUp, this.hand.rotationQuaternion!);

        this.grounded = Vector3.DistanceSquared(this.hand.position, wristTarget) <= 0.1;
    }
}