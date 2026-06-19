import { Vector3 } from "@babylonjs/core/Maths/math.vector.pure";

export enum MoveMode {
    Idle,
    Walk,
    Run,
    Sprint
}

export class WalkStyleProp {
    public bodyOffsetUpdate: (fSpeed: number, deltaFoot: Vector3, bodyOffsetRef: Vector3) => void = () => {};
    public stepHeight: number = 0.2;
    public stepDuration: number = 0.6;
    public stepFSkip: number = 1;
    public bootyShakiness: number = 0;

    constructor(public prop: HumanoidProp) {
        this.bodyOffsetUpdate = (fSpeed: number, deltaFoot: Vector3, bodyOffsetRef: Vector3) => {
            let maxOffsetHeight = this.prop.totalLegLength - this.prop.rightHipAnchor.y;
            let ll = this.prop.totalLegLengthSquared;
            let df = deltaFoot.scale(0.5).lengthSquared();
            bodyOffsetRef.copyFromFloats(0, 0.5 * maxOffsetHeight, 0);
            if (ll > df) {
                bodyOffsetRef.y = Math.sqrt(ll - df);
                bodyOffsetRef.y = Math.min(bodyOffsetRef.y, maxOffsetHeight) + 0.05 * fSpeed ;
            }
        }
    }
}

export class HumanoidProp {

    public maxSpeed: number = 3;

    public headAnchor: Vector3 = new Vector3(0, 0.5, 0);
    public torsoAnchor: Vector3 = new Vector3(0, 0.5, 0);
    public shoulderAnchor: Vector3 = new Vector3(0.2, 0, 0);
    public hipAnchor: Vector3 = new Vector3(0, 0.2, 0);
    public footTarget: Vector3 = new Vector3(0, 0.2, 0);
    public upperLegLength: number = 0.5;
    public lowerLegLength: number = 0.5;
    public footThickness: number = 0.1;
    public totalLegLength: number = this.upperLegLength + this.lowerLegLength + this.footThickness;
    public totalLegLengthSquared: number = this.totalLegLength * this.totalLegLength;
    public upperArmLength: number = 0.5;
    public lowerArmLength: number = 0.5;
    public handLength: number = 0.2;

    public walkStyle: WalkStyleProp[] = [];

    public rightShoulderAnchor: Vector3 = new Vector3(0.2, 0, 0);
    public leftShoulderAnchor: Vector3 = new Vector3(-0.2, 0, 0);
    public rightHipAnchor: Vector3 = new Vector3(0.2, 0, 0);
    public leftHipAnchor: Vector3 = new Vector3(-0.2, 0, 0)
    public rightFootTarget: Vector3 = new Vector3(0.2, 0, 0);
    public leftFootTarget: Vector3 = new Vector3(-0.2, 0, 0);

    constructor() {
        this.walkStyle[MoveMode.Idle] = new WalkStyleProp(this);
        this.walkStyle[MoveMode.Walk] = new WalkStyleProp(this);
        this.walkStyle[MoveMode.Run] = new WalkStyleProp(this);
        this.walkStyle[MoveMode.Sprint] = new WalkStyleProp(this);
    }

    public recompute(): void {
        this.totalLegLength = this.upperLegLength + this.lowerLegLength + this.footThickness;
        this.totalLegLengthSquared = this.totalLegLength * this.totalLegLength;

        this.rightShoulderAnchor.copyFrom(this.shoulderAnchor);
        this.leftShoulderAnchor.copyFrom(this.shoulderAnchor);
        this.leftShoulderAnchor.x *= -1;

        this.rightHipAnchor.copyFrom(this.hipAnchor);
        this.leftHipAnchor.copyFrom(this.hipAnchor);
        this.leftHipAnchor.x *= -1;

        this.rightFootTarget.copyFrom(this.footTarget);
        this.leftFootTarget.copyFrom(this.footTarget);
        this.leftFootTarget.x *= -1;
    }
}