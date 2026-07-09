import { Vector3 } from "@babylonjs/core/Maths/math.vector.pure";

export var HumanNames: string[] = [
    "Anne-Sophie",
    "Beatrice",
    "Colette",
    "Delphine",
    "Elisa",
    "Fleur",
    "Gwendoline",
    "Heloise",
    "Isabelle",
    "Jacqueline",
    "Karine",
    "Laetitia",
    "Mary",
    "Nolwenn",
    "Odette",
    "Pauline",
    "Qunégonde",
    "Roxane",
    "Sophie",
    "Tristane",
    "Ursule",
    "Valérie",
    "Wanda",
    "Xénia",
    "Yvette",
    "Zoé"
];
HumanNames.sort(() => { return Math.random() - 0.5; });

export function myRand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

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
    public stepLength: number = 0.7;
    public stepFSkip: number = 1;
    public stepEasing: (f: number) => number = (f: number) => { return f; };
    public stepEasingFactor: number = 0.5;
    public footPushFactor: number = 1;
    public bootyShakiness: number = 0;
    public handAmplitude: number = 1;
    public handBodyDX: number = 0.2;
    public handBodyDY: number = 0;
    public bodyLean: number = 0;

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

    public randomize(): void {
        this.stepHeight += myRand(-0.05, 0.05);
        this.stepDuration += myRand(-0.1, 0.1);
        this.stepFSkip += myRand(-0.1, 0.1);
        this.stepEasingFactor += myRand(-0.1, 0.1);
        this.footPushFactor += myRand(-0.2, 0.2);
        this.bootyShakiness += myRand(-0.1, 0.1);
        this.bodyLean += myRand(-0.1, 0.1);
        this.handAmplitude += myRand(-0.2, 0.2);
        this.handBodyDX += myRand(-0.1, 0.1);
        this.handBodyDX = Math.max(this.handBodyDX, this.prop.hipAnchor.x + 0.05);
        this.handBodyDY += myRand(-0.1, 0.1);
        this.stepEasingFactor += myRand(-0.1, 0.1);
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
    public overStrechAngleFactor: number = 1.0;
    public overStrechLengthMultiplier: number = 1.0;

    public walkStyle: WalkStyleProp[] = [];

    public rightShoulderAnchor: Vector3 = new Vector3(0.2, 0, 0);
    public leftShoulderAnchor: Vector3 = new Vector3(-0.2, 0, 0);
    public rightHipAnchor: Vector3 = new Vector3(0.2, 0, 0);
    public leftHipAnchor: Vector3 = new Vector3(-0.2, 0, 0)
    public footTargets: Vector3[] = [new Vector3(0.2, 0, 0), new Vector3(-0.2, 0, 0)];
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
        this.footTargets[0].copyFrom(this.rightFootTarget);
        this.footTargets[1].copyFrom(this.leftFootTarget);
    }

    public randomize(): void {
        this.footTarget.x += myRand(-0.1, 0.1);
        this.footTarget.x = Math.max(this.footTarget.x, 0.05);
        for (let walkStyle of this.walkStyle) {
            walkStyle.randomize();
        }
        this.recompute();
    }
}