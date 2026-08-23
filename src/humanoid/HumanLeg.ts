import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { Humanoid } from "./Humanoid";
import { Scene } from "@babylonjs/core/scene.pure";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.pure";
import { CloneVertexData, ColorizeVertexDataInPlace, CreateBeveledBoxVertexData, ForceDistanceFromOriginInPlace, MirrorXVertexDataInPlace, QuaternionFromYZAxisToRef, QuaternionFromZYAxisToRef, TranslateVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Human } from "./HumanController";
import { MakeStandardMaterial } from "../MaterialUtils";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.pure";
import { HumanoidProp } from "./HumanoidProp";

export class HumanLeg extends Mesh {

    public get prop(): HumanoidProp {
        return this.humanoid.prop;
    }

    public stepping: boolean = false;
    public hipWorldPosition: Vector3 = Vector3.Zero();
    public isLeft: boolean = false;

    public upperLeg: Mesh;
    public lowerLeg: Mesh;
    public foot: Mesh;

    public footTarget: Vector3 = Vector3.Zero();
    public footForward: Vector3 = Vector3.Forward();
    public footUp: Vector3 = Vector3.Up();
    private _kneeTarget: Vector3 = Vector3.Zero();

    public grounded: boolean = true;

    private _tmpZ: Vector3 = Vector3.Forward();

    //private groundedMaterial: StandardMaterial;
    //private ungroundedMaterial: StandardMaterial;

    constructor(public humanoid: Humanoid, isLeft: boolean) {
        super("leg", humanoid.getScene());
        this.isLeft = isLeft;
        //this.upperLeg = new Mesh("upperLeg", humanoid.getScene());
        this.upperLeg = new Mesh("upperLeg", humanoid.getScene());
        this.upperLeg.material = this.humanoid.material;
        this.upperLeg.rotationQuaternion = Quaternion.Identity();
        this.lowerLeg = new Mesh("lowerLeg", humanoid.getScene());
        this.lowerLeg.material = this.humanoid.material;
        this.lowerLeg.rotationQuaternion = Quaternion.Identity();
        this.foot = new Mesh("foot", humanoid.getScene());
        this.foot.material = this.humanoid.material;
        this.foot.rotationQuaternion = Quaternion.Identity();

        //this.groundedMaterial = MakeStandardMaterial(this.humanoid.getScene(), new Color3(0, 1, 0));
        //this.ungroundedMaterial = MakeStandardMaterial(this.humanoid.getScene(), new Color3(1, 0, 0));
    }

    public async instantiate(): Promise<void> {
        /*
        let upperLegVertexData = CreateBeveledBoxVertexData({ width: 0.1, height: 0.1, depth: this.upperLegLength });
        TranslateVertexDataInPlace(upperLegVertexData, new Vector3(0, 0, this.upperLegLength * 0.5));
        ColorizeVertexDataInPlace(upperLegVertexData, this.humanoid.color);
        upperLegVertexData.applyToMesh(this.upperLeg);
        let lowerLegVertexData = CreateBeveledBoxVertexData({ width: 0.1, height: 0.1, depth: this.lowerLegLength });
        TranslateVertexDataInPlace(lowerLegVertexData, new Vector3(0, 0, this.lowerLegLength * 0.5));
        ColorizeVertexDataInPlace(lowerLegVertexData, this.humanoid.color);
        lowerLegVertexData.applyToMesh(this.lowerLeg);
        let footVertexData = CreateBeveledBoxVertexData({ width: 0.1, height: 0.1, depth: this.footLength });
        TranslateVertexDataInPlace(footVertexData, new Vector3(0, 0, this.footLength * 0.5));
        ColorizeVertexDataInPlace(footVertexData, this.humanoid.color);
        footVertexData.applyToMesh(this.foot);
        */
        if (this.humanoid instanceof Human) {
            if (this.isLeft) {
                MirrorXVertexDataInPlace(CloneVertexData(this.humanoid.upperLegVertexData!)).applyToMesh(this.upperLeg);
                MirrorXVertexDataInPlace(CloneVertexData(this.humanoid.lowerLegVertexData!)).applyToMesh(this.lowerLeg);
                MirrorXVertexDataInPlace(CloneVertexData(this.humanoid.footVertexData!)).applyToMesh(this.foot);
            } else {
                this.humanoid.upperLegVertexData!.applyToMesh(this.upperLeg);
                this.humanoid.lowerLegVertexData!.applyToMesh(this.lowerLeg);
                this.humanoid.footVertexData!.applyToMesh(this.foot);
            }
        }
    }

    public update(): void {
        this._kneeTarget.copyFrom(this.hipWorldPosition).addInPlace(this.footTarget).scaleInPlace(0.5).addInPlace(this.humanoid.forward.scale(0.1));
        let ankleTarget = this.footUp.scale(this.prop.footThickness).add(this.footTarget);
        
        for (let n = 0; n < 3; n++) {
            ForceDistanceFromOriginInPlace(this._kneeTarget, ankleTarget, this.prop.lowerLegLength);
            ForceDistanceFromOriginInPlace(this._kneeTarget, this.hipWorldPosition, this.prop.upperLegLength);
        }

        this.foot.position.copyFrom(ankleTarget);
        ForceDistanceFromOriginInPlace(this.foot.position, this._kneeTarget, this.prop.lowerLegLength);
        this.upperLeg.position.copyFrom(this.hipWorldPosition);
        this.lowerLeg.position.copyFrom(this._kneeTarget);

        this._tmpZ.copyFrom(this._kneeTarget).subtractInPlace(this.hipWorldPosition);
        QuaternionFromZYAxisToRef(this._tmpZ, this.humanoid.body.forward, this.upperLeg.rotationQuaternion!);
        
        this._tmpZ.copyFrom(this.foot.position).subtractInPlace(this._kneeTarget);
        QuaternionFromZYAxisToRef(this._tmpZ, this.humanoid.body.forward, this.lowerLeg.rotationQuaternion!);
        
        QuaternionFromYZAxisToRef(this.footUp, this.footForward, this.foot.rotationQuaternion!);

        this.grounded = Vector3.DistanceSquared(this.foot.position, ankleTarget) <= 0.01;
        //this.foot.material = this.grounded ? this.groundedMaterial : this.ungroundedMaterial;
    }
}