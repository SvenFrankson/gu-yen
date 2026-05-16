import { Vector3, Mesh, Quaternion } from "@babylonjs/core";
import { ForceDistanceFromOriginInPlace, QuaternionFromZYAxisToRef, QuaternionFromYZAxisToRef } from "babylonjs-tiaratumgames-tools";


export enum KneeMode {
    Backward,
    Vertical,
    Outward,
    Walker
}

export class Leg {

    public kneeMode: KneeMode = KneeMode.Vertical;
    public initialKneePos?: Vector3;

    public footLength: number = 0.5;
    public lowerLegLength: number = 1;
    public upperLegLength: number = 1;
    public footThickness: number = 0.23;
    public get totalLength(): number {
        return (this.upperLegLength + this.lowerLegLength) * this.scale;
    }

    public foot: Mesh;
    public lowerLeg: Mesh;
    public upperLeg: Mesh;

    public footPos: Vector3 = Vector3.Zero();
    public footUp: Vector3 = new Vector3(0, 1, 0);
    public footForward: Vector3 = new Vector3(0, 0, 1);

    public hipPos: Vector3 = Vector3.Zero();
    public right: Vector3 = new Vector3(1, 0, 0);
    public up: Vector3 = new Vector3(0, 1, 0);
    public forward: Vector3 = new Vector3(0, 0, 1);

    public grounded: boolean = false;

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

    constructor(public isLeftLeg?: boolean) {
        this.foot = new Mesh("foot");
        this.foot.rotationQuaternion = Quaternion.Identity();
        this.lowerLeg = new Mesh("lower-leg");
        this.lowerLeg.rotationQuaternion = Quaternion.Identity();
        this.upperLeg = new Mesh("upper-leg");
        this.upperLeg.rotationQuaternion = Quaternion.Identity();
    }

    private _upperLegZ: Vector3 = Vector3.Forward();
    private _lowerLegZ: Vector3 = Vector3.Forward();
    private _kneePos: Vector3 = Vector3.Zero();
    private _raisedFootPos: Vector3 = Vector3.Zero();
    public updatePositions(): void {
        this._raisedFootPos.copyFrom(this.footUp).scaleInPlace(this.footThickness).addInPlace(this.footPos);
        if (this.initialKneePos) {
            this._kneePos.copyFrom(this.initialKneePos);
        }
        else if (this.kneeMode === KneeMode.Backward) {
            this._kneePos.copyFrom(this.hipPos).addInPlace(this._raisedFootPos).scaleInPlace(0.5).addInPlace(this.footUp.normalize()).subtractInPlace(this.forward).addInPlace(this.right.scale(this.isLeftLeg ? -1 : 1));
        }
        else if (this.kneeMode === KneeMode.Vertical) {
            this._kneePos.copyFrom(this.hipPos).addInPlace(this._raisedFootPos).scaleInPlace(0.5).addInPlace(this.footUp.normalize());
        }
        else if (this.kneeMode === KneeMode.Outward) {
            this._kneePos.copyFrom(this.hipPos).addInPlace(this._raisedFootPos).scaleInPlace(0.5).addInPlace(this.right.scale(this.isLeftLeg ? -1 : 1));
        }
        else if (this.kneeMode === KneeMode.Walker) {
            this._kneePos.copyFrom(this.hipPos).addInPlace(this._raisedFootPos).scaleInPlace(0.5).subtractInPlace(this.forward).addInPlace(this.right.scale(this.isLeftLeg ? - 0.3 : 0.3));
        }
        
        for (let n = 0; n < 2; n++) {
            ForceDistanceFromOriginInPlace(this._kneePos, this._raisedFootPos, this.lowerLegLength * this.scale);
            ForceDistanceFromOriginInPlace(this._kneePos, this.hipPos, this.upperLegLength * this.scale);
        }

        this._upperLegZ.copyFrom(this._kneePos).subtractInPlace(this.hipPos).normalize();
        this._lowerLegZ.copyFrom(this._raisedFootPos).subtractInPlace(this._kneePos).normalize();

        this.upperLeg.position.copyFrom(this.hipPos);
        QuaternionFromZYAxisToRef(this._upperLegZ, this.up, this.upperLeg.rotationQuaternion!);

        this._upperLegZ.scaleInPlace(this.upperLegLength * this.scale);
        this._kneePos.copyFrom(this.hipPos).addInPlace(this._upperLegZ);
        
        this.lowerLeg.position.copyFrom(this._kneePos);
        if (this.kneeMode === KneeMode.Backward) {
            QuaternionFromZYAxisToRef(this._lowerLegZ, this._upperLegZ, this.lowerLeg.rotationQuaternion!);
        }
        else if (this.kneeMode === KneeMode.Vertical) {
            QuaternionFromZYAxisToRef(this._lowerLegZ, this._upperLegZ, this.lowerLeg.rotationQuaternion!);
        }
        else if (this.kneeMode === KneeMode.Outward) {
            QuaternionFromZYAxisToRef(this._lowerLegZ, this._upperLegZ, this.lowerLeg.rotationQuaternion!);
        }
        else if (this.kneeMode === KneeMode.Walker) {
            QuaternionFromZYAxisToRef(this._lowerLegZ, this._upperLegZ.scale(-1), this.lowerLeg.rotationQuaternion!);
        }
        
        this._lowerLegZ.scaleInPlace(this.lowerLegLength * this.scale);
        this.foot.position.copyFrom(this.lowerLeg.position).addInPlace(this._lowerLegZ);

        QuaternionFromYZAxisToRef(this.footUp, this.footForward, this.foot.rotationQuaternion!);
    }
}