import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { Humanoid } from "./Humanoid";
import { Scene } from "@babylonjs/core/scene.pure";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.pure";
import { ColorizeVertexDataInPlace, CreateBeveledBoxVertexData, ForceDistanceFromOriginInPlace, QuaternionFromYZAxisToRef, QuaternionFromZYAxisToRef, TranslateVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

export class HumanLeg extends Mesh {

    public hipWorldPosition: Vector3 = Vector3.Zero();
    public isLeft: boolean = false;

    public footThickness: number = 0.1;
    public upperLegLength: number = 0.5;
    public lowerLegLength: number = 0.5;
    public footLength: number = 0.2;
    public get totalLength(): number {
        return (this.upperLegLength + this.lowerLegLength) * this.scale;
    }
    public get totalLengthSquared(): number {
        return this.totalLength * this.totalLength;
    }

    public upperLeg: Mesh;
    public lowerLeg: Mesh;
    public foot: Mesh;

    public footTarget: Vector3 = Vector3.Zero();
    public footForward: Vector3 = Vector3.Forward();
    public footUp: Vector3 = Vector3.Up();
    private _kneeTarget: Vector3 = Vector3.Zero();

    public grounded: boolean = true;

    private _scale: number = 1;
    public get scale(): number {
        return this._scale;
    }
    public set scale(s: number) {
        this._scale = s;
        this.upperLeg.scaling.copyFromFloats(this.scale, this.scale, this.scale);
        this.lowerLeg.scaling.copyFromFloats(this.scale, this.scale, this.scale);
        this.foot.scaling.copyFromFloats(this.scale, this.scale, this.scale);
    }
    private _tmpZ: Vector3 = Vector3.Forward();

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
    }

    public async instantiate(): Promise<void> {
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
    }

    public update(): void {
        this._kneeTarget.copyFrom(this.hipWorldPosition).addInPlace(this.footTarget).scaleInPlace(0.5).addInPlace(this.humanoid.forward);
        
        for (let n = 0; n < 3; n++) {
            ForceDistanceFromOriginInPlace(this._kneeTarget, this.footTarget, this.lowerLegLength);
            ForceDistanceFromOriginInPlace(this._kneeTarget, this.hipWorldPosition, this.upperLegLength);
        }

        this.foot.position.copyFrom(this.footTarget);
        ForceDistanceFromOriginInPlace(this.foot.position, this._kneeTarget, this.lowerLegLength);
        this.upperLeg.position.copyFrom(this.hipWorldPosition);
        this.lowerLeg.position.copyFrom(this._kneeTarget);

        this._tmpZ.copyFrom(this._kneeTarget).subtractInPlace(this.hipWorldPosition);
        QuaternionFromZYAxisToRef(this._tmpZ, this.humanoid.forward, this.upperLeg.rotationQuaternion!);
        
        this._tmpZ.copyFrom(this.foot.position).subtractInPlace(this._kneeTarget);
        QuaternionFromZYAxisToRef(this._tmpZ, this.humanoid.forward, this.lowerLeg.rotationQuaternion!);
        
        QuaternionFromYZAxisToRef(this.footUp, this.footForward, this.foot.rotationQuaternion!);
    }
}