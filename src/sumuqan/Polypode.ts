import { Vector3, Mesh, Material, MeshBuilder, Quaternion, Space, Ray, Color3 } from "@babylonjs/core";
import { Antenna } from "./Antenna";
import { KneeMode, Leg } from "./Leg";
import { Collider, DrawDebugHit, DrawDebugPoint, IsFinite, QuaternionFromYZAxis, QuaternionFromYZAxisToRef, QuaternionFromZYAxisToRef, RandomInSphereCut, RayCollidersIntersection, SphereCollider, SphereCollidersIntersection } from "babylonjs-tiaratumgames-tools";
import { IScorpionTailProps, ScorpionTail } from "./ScorpionTail";
import { IsVeryFinite, MinMax } from "../Number";
import { smoothNSec } from "../Tools";
import { Chunck } from "../voxel-engine/Chunck";
import { SphereChuncksIntersection } from "../voxel-engine/TmpMath";

export interface IPolypodeProps {
    size?: number;
    legPairsCount: number;
    hipAnchors?: Vector3[];
    rightHipAnchors?: Vector3[];
    leftHipAnchors?: Vector3[];
    footTargets?: Vector3[];
    rightFootTargets?: Vector3[];
    leftFootTargets?: Vector3[];
    footThickness?: number;
    kneeMode?: KneeMode;
    upperLegLength?: number;
    lowerLegLength?: number;
    legScales?: number[];
    stepDuration?: number;
    stepDurationMin?: number;
    stepDurationMax?: number;
    stepHeight?: number;
    stepHeightMin?: number;
    stepHeightMax?: number;
    stepSimultaneousMaxCount?: number;
    bootyShakiness?: number;
    bodyLocalOffset?: Vector3;
    bodyWorldOffset?: Vector3;
    headAnchor?: Vector3;
    
    antennaAnchor?: Vector3;
    antennaAlphaZero?: number;
    antennaBetaZero?: number;
    antennaLength?: number;

    scorpionTailProps?: IScorpionTailProps;
}

export class Polypode extends Mesh {

    public size: number = 1;
    public speed: number = 0;
    private _fSpeed: number = 0; // normalized speed between a min and a max (now 0 and 0.5)
    public rotationSpeed: number = 0;
    public targetUp: Vector3 = Vector3.Up();
    
    public bodyColliders: SphereCollider[] = [];
    public terrain: (Collider | Mesh)[] = [];
    public chuncks: Chunck[] = [];

    // Debug collision display [v]
    protected _showCollisionDebug: boolean = false;
    public get showCollisionDebug(): boolean {
        return this._showCollisionDebug;
    }
    public set showCollisionDebug(v: boolean) {
        this._showCollisionDebug = v;
        this.debugBodyCollidersMeshes.forEach(mesh => {
            mesh.isVisible = this._showCollisionDebug;
        });
        if (this.tail && this.tail.debugColliderMesh) {
            this.tail.debugColliderMesh.isVisible = this._showCollisionDebug;
        }
    }
    protected _showPOVDebug: boolean = false;
    public get showPOVDebug(): boolean {
        return this._showPOVDebug;
    }
    public set showPOVDebug(v: boolean) {
        this._showPOVDebug = v;
        //this.debugPovMesh.isVisible = this._showPOVDebug;
    }

    //public debugPovMesh: Mesh;
    public debugBodyCollidersMeshes: Mesh[] = [];

    private _debugColliderMaterial: Material | null = null;
    public get debugColliderMaterial(): Material | null {
        return this._debugColliderMaterial;
    }
    public set debugColliderMaterial(mat: Material) {
        this._debugColliderMaterial = mat;
        this.debugBodyCollidersMeshes.forEach(mesh => {
            mesh.material = this._debugColliderMaterial;
        });
        if (this.tail && this.tail.debugColliderMesh) {
            this.tail.debugColliderMesh.material = this._debugColliderMaterial;
        }
    }
    private _debugColliderHitMaterial: Material | null = null;
    public get debugColliderHitMaterial(): Material | null {
        return this._debugColliderHitMaterial;
    }
    public set debugColliderHitMaterial(mat: Material) {
        this._debugColliderHitMaterial = mat;
    }

    private _debugPovMaterial: Material | null = null;
    public get debugPovMaterial(): Material | null {
        return this._debugPovMaterial;
    }
    public set debugPovMaterial(mat: Material) {
        //if (this.debugPovMesh) {
        //    this.debugPovMesh.material = mat;
        //}
        this._debugPovMaterial = mat;
    }
    // [^] Debug collision display

    public mentalMap: Vector3[] = [];
    public mentalMapNormal: Vector3[] = [];
    public mentalMapIndex: number = 0;
    public mentalMapMaxSize: number = 200;
    public localNormal: Vector3 = Vector3.Up();
    
    public mentalCheckPerFrame: number = 3;

    public legPairCount: number = 2;
    public get legCount(): number {
        return this.legPairCount * 2;
    }
    public headAnchor: Vector3 = new Vector3(0, Math.SQRT2, Math.SQRT2);

    public rightHipAnchors: Vector3[];
    public leftHipAnchors: Vector3[];

    public rightFootTargets: Vector3[];
    public leftFootTargets: Vector3[];
    public setFootTarget(v: Vector3, index: number): void {
        this.rightFootTargets[index].copyFrom(v);
        this.leftFootTargets[index].copyFrom(v);
        this.leftFootTargets[index].x *= -1;
    }

    private _footThickness: number = 1.2;
    public get footThickness(): number {
        return this._footThickness;
    }
    public setFootThickness(v: number) {
        this._footThickness = v;
        for (let i = 0; i < this.legPairCount; i++) {
            this.rightLegs[i].footThickness = this._footThickness;
            this.leftLegs[i].footThickness = this._footThickness;
        }
    }
    
    public stepDurationMin: number = 0.3;
    public stepDurationMax: number = 0.7;
    public stepHeightMin: number = 0.2;
    public stepHeightMax: number = 0.7;
    public stepSimultaneousMaxCount: number = 2;
    public bootyShakiness: number = 0.5;

    public bodyLocalOffset: Vector3 = Vector3.Zero();
    public bodyWorldOffset: Vector3 = Vector3.Zero();

    public body: Mesh;
    public head: Mesh;
    public leftLegs: Leg[] = [];
    public rightLegs: Leg[] = [];
    public legs: Leg[] = [];
    public antennas: Antenna[] = [];
    public tail: ScorpionTail | null = null;

    public povOffset: Vector3 = new Vector3(0, 1, 0);
    public povAlpha: number = 5 * Math.PI / 3;
    public povBetaMin: number = Math.PI / 10;
    public povBetaMax: number = Math.PI / 2.1;
    public povRadiusMax: number = 1.5;
    public povRadiusMin: number = 0.2;

    private _stepping: number = 0;

    constructor(name: string, prop: IPolypodeProps) {
        super(name);

        if (prop && IsVeryFinite(prop.size)) {
            this.size = prop.size!;
        }
        this.legPairCount = prop.legPairsCount;

        // Create all required meshes
        this.body = MeshBuilder.CreateSphere("body", { diameterX: 1, diameterY: 1, diameterZ: 1.5 });
        this.body.scaling.copyFromFloats(this.size, this.size, this.size);
        this.body.rotationQuaternion = Quaternion.Identity();

        for (let i = 0; i < this.legPairCount; i++) {
            this.rightLegs[i] = new Leg();
            this.rightLegs[i].kneeMode = KneeMode.Vertical;
            this.leftLegs[i] = new Leg(true);
            this.leftLegs[i].kneeMode = KneeMode.Vertical;
        }
        this.legs = [...this.rightLegs, ...this.leftLegs];
        
        this.head = MeshBuilder.CreateSphere("head", { diameterX: 0.5, diameterY: 0.5, diameterZ: 0.75 });
        this.head.scaling.copyFromFloats(this.size, this.size, this.size);
        this.head.rotationQuaternion = Quaternion.Identity();

        if (IsFinite(prop.antennaAnchor!)) {
            this.antennas = [
                new Antenna(this, false),
                new Antenna(this, true)
            ];
            this.antennas[0].position.copyFrom(prop.antennaAnchor!);
            this.antennas[1].position.copyFrom(prop.antennaAnchor!);
            this.antennas[1].position.x *= - 1;

            if (isFinite(prop.antennaAlphaZero!)) {
                this.antennas[0].alpha0 = prop.antennaAlphaZero!;
                this.antennas[1].alpha0 = prop.antennaAlphaZero!;
            }
            if (isFinite(prop.antennaBetaZero!)) {
                this.antennas[0].beta0 = prop.antennaBetaZero!;
                this.antennas[1].beta0 = prop.antennaBetaZero!;
            }
            if (isFinite(prop.antennaLength!)) {
                this.antennas[0].length = prop.antennaLength!;
                this.antennas[1].length = prop.antennaLength!;
            }
        }

        // Apply properties
        if (IsFinite(prop.headAnchor!)) {
            this.headAnchor = prop.headAnchor!;
        }
        
        if (prop.hipAnchors) {
            // HipAnchors provided
            this.rightHipAnchors = [...prop.hipAnchors].map(v => { return v.clone(); });
            this.leftHipAnchors = [...prop.hipAnchors].map(v => { return v.multiplyByFloats(- 1, 1, 1); });
        }
        else {
            if (prop.rightHipAnchors && prop.leftHipAnchors) {
                // Right and Left HipAnchors provided
                this.rightHipAnchors = [...prop.rightHipAnchors].map(v => { return v.clone(); });
                this.leftHipAnchors = [...prop.leftHipAnchors].map(v => { return v.clone(); });
            }
            else {
                // Generate default HipAnchors
                this.rightHipAnchors = [];
                this.leftHipAnchors = [];
                for (let i = 0; i < this.legPairCount; i++) {
                    let a = (i + 1) / (this.legPairCount + 1) * Math.PI;
                    let cosa = Math.cos(a);
                    let sina = Math.sin(a);
                    this.rightHipAnchors[i] = (new Vector3(sina, 0, cosa)).normalize();
                    this.leftHipAnchors[i] = (new Vector3(- sina, 0, cosa)).normalize();
                }
            }
        }
        
        if (prop.footTargets) {
            // FootTargets provided
            this.rightFootTargets = [...prop.footTargets].map(v => { return v.clone().scaleInPlace(this.size); });
            this.leftFootTargets = [...prop.footTargets].map(v => { return v.multiplyByFloats(- 1, 1, 1).scaleInPlace(this.size); });
        }
        else {
            if (prop.rightFootTargets && prop.leftFootTargets) {
                // Right and Left FootTargets provided
                this.rightFootTargets = [...prop.rightFootTargets].map(v => { return v.clone().scaleInPlace(this.size); });
                this.leftFootTargets = [...prop.leftFootTargets].map(v => { return v.clone().scaleInPlace(this.size); });
            }
            else {
                // Generate default FootTargets
                this.rightFootTargets = [];
                this.leftFootTargets = [];
                for (let i = 0; i < this.legPairCount; i++) {
                    let a = (i + 1) / (this.legPairCount + 1) * Math.PI;
                    let cosa = Math.cos(a);
                    let sina = Math.sin(a);
                    this.rightFootTargets[i] = (new Vector3(sina, - 0.5, cosa)).normalize().scaleInPlace(2).scaleInPlace(this.size);
                    this.leftFootTargets[i] = (new Vector3(- sina, - 0.5, cosa)).normalize().scaleInPlace(2).scaleInPlace(this.size);
                }
            }
        }

        if (isFinite(prop.footThickness!)) {
            for (let i = 0; i < this.legPairCount; i++) {
                this.rightLegs[i].footThickness = prop.footThickness!;
                this.leftLegs[i].footThickness = prop.footThickness!;
            }
        }

        if (isFinite(prop.kneeMode!)) {
            for (let i = 0; i < this.legPairCount; i++) {
                this.rightLegs[i].kneeMode = prop.kneeMode!;
                this.leftLegs[i].kneeMode = prop.kneeMode!;
            }
        }

        if (isFinite(prop.upperLegLength!)) {
            for (let i = 0; i < this.legPairCount; i++) {
                this.rightLegs[i].upperLegLength = prop.upperLegLength!;
                this.leftLegs[i].upperLegLength = prop.upperLegLength!;
            }
        }

        if (isFinite(prop.lowerLegLength!)) {
            for (let i = 0; i < this.legPairCount; i++) {
                this.rightLegs[i].lowerLegLength = prop.lowerLegLength!;
                this.leftLegs[i].lowerLegLength = prop.lowerLegLength!;
            }
        }

        if (prop.legScales) {
            for (let i = 0; i < this.legPairCount; i++) {
                if (isFinite(prop.legScales[i])) {
                    this.rightLegs[i].scale = prop.legScales[i] * this.size;
                    this.leftLegs[i].scale = prop.legScales[i] * this.size;
                }
            }
        }

        if (isFinite(prop.stepDuration!)) {
            this.stepDurationMin = prop.stepDuration!;
            this.stepDurationMax = prop.stepDuration!;
        }
        if (isFinite(prop.stepDurationMin!)) {
            this.stepDurationMin = prop.stepDurationMin!;
        }
        if (isFinite(prop.stepDurationMax!)) {
            this.stepDurationMax = prop.stepDurationMax!;
        }

        if (isFinite(prop.stepHeight!)) {
            this.stepHeightMin = prop.stepHeight! * this.size;
            this.stepHeightMax = prop.stepHeight! * this.size;
        }
        if (isFinite(prop.stepHeightMin!)) {
            this.stepHeightMin = prop.stepHeightMin! * this.size;
        }
        if (isFinite(prop.stepHeightMax!)) {
            this.stepHeightMax = prop.stepHeightMax! * this.size;
        }
        if (isFinite(prop.stepSimultaneousMaxCount!)) {
            this.stepSimultaneousMaxCount = prop.stepSimultaneousMaxCount!;
        }
        
        if (isFinite(prop.bootyShakiness!)) {
            this.bootyShakiness = prop.bootyShakiness!;
        }

        if (IsFinite(prop.bodyLocalOffset!)) {
            this.bodyLocalOffset = prop.bodyLocalOffset!;
        }
        
        if (IsFinite(prop.bodyWorldOffset!)) {
            this.bodyWorldOffset = prop.bodyWorldOffset!;
        }

        if (prop.scorpionTailProps) {
            this.tail = new ScorpionTail(this, prop.scorpionTailProps);
        }

        /*
        this.debugPovMesh = CreateSphereCut(
            "debug-pov-mesh",
            {
                dir: Vector3.Forward(),
                alpha: this.povAlpha,
                betaMin: this.povBetaMin,
                betaMax: this.povBetaMax,
                rMin: this.povRadiusMin,
                rMax: this.povRadiusMax
            }
        )
        this.debugPovMesh.parent = this;
        this.debugPovMesh.position = this.povOffset;
        this.debugPovMesh.isVisible = this._showCollisionDebug;
        */
    }

    public setPosition(p: Vector3): void {
        this.position.copyFrom(p);
        let m = this.computeWorldMatrix(true);
        
        for (let i = 0; i < this.legPairCount; i++) {
            Vector3.TransformCoordinatesToRef(this.rightFootTargets[i], m, this.rightLegs[i].footPos);
            Vector3.TransformCoordinatesToRef(this.leftFootTargets[i], m, this.leftLegs[i].footPos);
        }

        this.body.position.copyFrom(this.leftLegs[0].footPos).addInPlace(this.rightLegs[0].footPos).scaleInPlace(0.5);
        this.body.position.addInPlace(this.up.scale(0.5));

        this.body.computeWorldMatrix(true);

        for (let i = 0; i < this.legPairCount; i++) {
            Vector3.TransformCoordinatesToRef(this.leftHipAnchors[i], this.body.getWorldMatrix(), this.leftLegs[i].hipPos);
            Vector3.TransformCoordinatesToRef(this.rightHipAnchors[i], this.body.getWorldMatrix(), this.rightLegs[i].hipPos);
        }
        Vector3.TransformCoordinatesToRef(this.headAnchor, this.body.getWorldMatrix(), this.head.position);
    }

    public async initialize(): Promise<void> {
        this.getScene().onBeforeRenderObservable.add(this._update);
    }

    public isGrounded(): boolean {
        for (let i = 0; i < this.legs.length; i++) {
            if (this.legs[i].grounded) {
                return true;
            }
        }
        return false;
    }

    private async step(leg: Leg, target: Vector3, targetNorm: Vector3, targetForward: Vector3): Promise<void> {
        return new Promise<void>(resolve => {
            let origin = leg.footPos.clone();
            let originNorm = leg.footUp.clone();
            let originForward = leg.footForward.clone();
            let destination = target.clone();
            let destinationNorm = targetNorm.clone();
            let destinationForward = targetForward.clone();
            let dist = 1.5 * Vector3.Distance(origin, destination);
            let hMax = Math.min(Math.max(this.stepHeightMin, dist), this.stepHeightMax);
            let duration = Math.min(Math.max(this.stepDurationMin, dist), this.stepDurationMax) * Math.sqrt(this.size);
            duration *= 3 * (1 - this._fSpeed) + 1 * this._fSpeed;
            let t = 0;
            let animationCB = () => {
                t += this.getScene().getEngine().getDeltaTime() / 1000;
                let f = t / duration;
                let h = Math.sqrt(Math.sin(f * Math.PI)) * hMax;
                if (f < 1) {
                    let p = origin.scale(1 - f).addInPlace(destination.scale(f));
                    let n = originNorm.scale(1 - f).addInPlace(destinationNorm.scale(f)).normalize();
                    let forward = originForward.scale(1 - f).addInPlace(destinationForward.scale(f)).normalize();
                    //let n = this.up;
                    p.addInPlace(n.scale(h * Math.sin(f * Math.PI)));
                    leg.footPos.copyFrom(p);
                    leg.footUp.copyFrom(n);
                    leg.footForward.copyFrom(forward);
                }
                else {
                    leg.footPos.copyFrom(destination);
                    leg.footUp.copyFrom(destinationNorm);
                    leg.footForward.copyFrom(destinationForward);
                    this.getScene().onBeforeRenderObservable.removeCallback(animationCB);
                    resolve();
                }
            }
            this.getScene().onBeforeRenderObservable.add(animationCB);
        })
    }

    private _update = () => {
        let dt = this.getScene().deltaTime / 1000;
        if (isNaN(dt)) {
            return;
        }
        this._fSpeed = MinMax(this.speed / 0.5, 0, 1);

        this.position.addInPlace(this.forward.scale(this.speed * dt));
        this.rotate(this.up, this.rotationSpeed * dt, Space.WORLD);
        this.computeWorldMatrix(true);
        QuaternionFromYZAxisToRef(this.body.up.add(this.targetUp), this.forward, this.rotationQuaternion!);
        
        // Terrain scan [v]
        let fFindUp = 0.999 * (1 - this._fSpeed) + 0.98 * this._fSpeed;
        let origins = [
            Vector3.TransformCoordinates(this.povOffset, this.getWorldMatrix()),
            Vector3.TransformCoordinates(this.povOffset, this.head.getWorldMatrix()),
            Vector3.TransformCoordinates(this.povOffset, this.body.getWorldMatrix()),
        ];
        for (let i = 0; i < this.mentalCheckPerFrame; i++) {
            let distCheck = this.povRadiusMax * this.size;
            let dir = RandomInSphereCut(this.forward, - this.povAlpha * 0.5, this.povAlpha * 0.5, this.povBetaMin, this.povBetaMax, this.up);
            let origin = origins[Math.floor(Math.random() * origins.length)];
            let ray = new Ray(origin, dir, distCheck);
            let intersection = RayCollidersIntersection(ray, this.terrain);
            //DrawDebugLine(ray.origin, ray.origin.add(ray.direction.scale(distCheck)), this.mentalMapMaxSize / this.mentalCheckPerFrame, Color3.White());
            if (intersection.hit) {
                let n = intersection.normal!;
                if (Vector3.Dot(n, this.up) > - 0.5) {
                    this.mentalMap[this.mentalMapIndex] = intersection.point!;
                    this.mentalMapNormal[this.mentalMapIndex] = n;
                    this.localNormal.scaleInPlace(fFindUp).addInPlace(this.mentalMapNormal[this.mentalMapIndex].scale(1 - fFindUp));
                    if (this._showPOVDebug) {
                        DrawDebugHit(intersection.point!, this.mentalMapNormal[this.mentalMapIndex], this.mentalMapMaxSize / this.mentalCheckPerFrame, Color3.Green());
                    }
                    this.mentalMapIndex = (this.mentalMapIndex + 1) % this.mentalMapMaxSize;
                }
            }
        }
        this.localNormal.normalize();

        let footUps = this.legs.map(leg => leg.footUp).reduce((a, b) => a.add(b)).scaleInPlace(1 / this.legCount);
        this.localNormal = Vector3.SlerpToRef(this.localNormal, footUps, 1, this.localNormal);
        // [^] Terrain scan

        for (let i = 0; i < this.legPairCount; i++) {
            Vector3.TransformCoordinatesToRef(this.leftHipAnchors[i], this.body.getWorldMatrix(), this.leftLegs[i].hipPos);
            Vector3.TransformCoordinatesToRef(this.rightHipAnchors[i], this.body.getWorldMatrix(), this.rightLegs[i].hipPos);
        }
        Vector3.TransformCoordinatesToRef(this.headAnchor, this.body.getWorldMatrix(), this.head.position);

        for (let i = 0; i < this.legPairCount; i++) {
            this.leftLegs[i].right = this.right;
            this.leftLegs[i].up = this.up;
            this.leftLegs[i].forward = this.forward;

            this.rightLegs[i].right = this.right;
            this.rightLegs[i].up = this.up;
            this.rightLegs[i].forward = this.forward;
        }

        let m = this.computeWorldMatrix(true);

        if (this._stepping < this.stepSimultaneousMaxCount) {
            let averageTimeBetweenStep = MinMax(2 - 20 * Math.abs(this.speed), 0, 2);
            let prob1s = 1 / averageTimeBetweenStep;
            let probDT = dt * prob1s;
            if (Math.random() < probDT) {
                let legTarget = Vector3.Zero();
                let longestStepDist = 0;
                let legToMove: Leg;
                let targetPosition: Vector3;
                let targetNormal: Vector3;

                for (let i = 0; i < this.legPairCount; i++) {

                    Vector3.TransformCoordinatesToRef(this.rightFootTargets[i], m, legTarget);
                    let targetRight: Vector3 | undefined;
                    let normalRight: Vector3 | undefined;
                    let closestMentalMapSqrDist = Infinity;

                    for (let j = 0; j < this.mentalMap.length; j++) {
                        let mentalPoint = this.mentalMap[j];
                        let sqrD = Vector3.DistanceSquared(legTarget, mentalPoint);
                        if (sqrD < closestMentalMapSqrDist) {
                            if (Vector3.DistanceSquared(this.rightLegs[i].hipPos, mentalPoint) < this.rightLegs[i].totalLengthSquared * 1) {
                                targetRight = mentalPoint;
                                normalRight = this.mentalMapNormal[j];
                                closestMentalMapSqrDist = sqrD;
                            }
                        }
                    }
                    if (targetRight) {
                        let d = Vector3.DistanceSquared(this.rightLegs[i].foot.position, targetRight) / this.rightLegs[i].totalLengthSquared;
                        if (d > longestStepDist) {
                            longestStepDist = d;
                            legToMove = this.rightLegs[i];
                            targetPosition = targetRight;
                            targetNormal = normalRight!;
                            DrawDebugPoint(targetPosition, 60, Color3.Red(), 1);
                        }
                    }

                    Vector3.TransformCoordinatesToRef(this.leftFootTargets[i], m, legTarget);
                    //DrawDebugPoint(legTarget, 60, Color3.Blue(), 1);
                    let targetLeft: Vector3 | undefined;
                    let normalLeft: Vector3 | undefined;
                    closestMentalMapSqrDist = Infinity;

                    for (let j = 0; j < this.mentalMap.length; j++) {
                        let mentalPoint = this.mentalMap[j];
                        let sqrD = Vector3.DistanceSquared(legTarget, mentalPoint);
                        if (sqrD < closestMentalMapSqrDist) {
                            if (Vector3.DistanceSquared(this.leftLegs[i].hipPos, mentalPoint) < this.leftLegs[i].totalLengthSquared * 1) {
                                targetLeft = mentalPoint;
                                normalLeft = this.mentalMapNormal[j];
                                closestMentalMapSqrDist = sqrD;
                            }
                        }
                    }
                    if (targetLeft) {
                        let d = Vector3.DistanceSquared(this.leftLegs[i].foot.position, targetLeft) / this.leftLegs[i].totalLengthSquared;
                        if (d > longestStepDist) {
                            longestStepDist = d;
                            legToMove = this.leftLegs[i];
                            targetPosition = targetLeft;
                            targetNormal = normalLeft!;
                            DrawDebugPoint(targetPosition, 60, Color3.Red(), 1);
                        }
                    }
                }

                if (longestStepDist > 0.01) {
                    this._stepping++;
                    //DrawDebugLine(legToMove.hipPos, targetPosition, 60, Color3.Yellow());
                    this.step(legToMove!, targetPosition!, targetNormal!.scale(0.3).add(this.up.scale(0.7)), this.forward).then(
                        () => {
                            legToMove!.grounded = true;
                            this._stepping--;
                        }
                    );
                } 
            }
        }

        for (let i = 0; i < this.legPairCount; i++) {
            this.leftLegs[i].updatePositions();
            this.rightLegs[i].updatePositions();
        }

        let bodyPos = Vector3.Zero();
        let offset = Vector3.Zero();
        let averageRightFoot = Vector3.Zero();
        let averageLeftFoot = Vector3.Zero();
        for (let i = 0; i < this.legPairCount; i++) {
            averageRightFoot.addInPlace(this.rightLegs[i].foot.absolutePosition);
            averageLeftFoot.addInPlace(this.leftLegs[i].foot.absolutePosition);

            offset.addInPlace(this.rightFootTargets[i].scale(-1));
            offset.addInPlace(this.leftFootTargets[i].scale(-1));
        }
        averageRightFoot.scaleInPlace(1 / this.legPairCount);
        averageLeftFoot.scaleInPlace(1 / this.legPairCount);
        bodyPos.copyFrom(averageRightFoot).addInPlace(averageLeftFoot).scaleInPlace(0.5);
        offset.scaleInPlace(1 / this.legCount);
        offset.addInPlace(this.bodyLocalOffset);
        Vector3.TransformNormalToRef(offset, this.getWorldMatrix(), offset);
        offset.addInPlace(this.bodyWorldOffset);
        bodyPos.addInPlace(offset);

        averageRightFoot.subtractInPlace(this.body.position);
        averageLeftFoot.subtractInPlace(this.body.position);
        let quatFromLeg = QuaternionFromYZAxis(this.localNormal, this.forward);

        Quaternion.SlerpToRef(this.body.rotationQuaternion!, quatFromLeg, 1 - smoothNSec(1 / dt, 0.1), this.body.rotationQuaternion!);
        
        QuaternionFromZYAxisToRef(this.forward, this.up, this.head.rotationQuaternion!);

        Vector3.LerpToRef(this.body.position, bodyPos, 1 - smoothNSec(1 / dt, 0.3), this.body.position);

        // Terrain collision [v]
        let collideWithTerrain = false;
        let r = 0;
        for (let i = 0; i < this.bodyColliders.length; i++) {
            if (this.showCollisionDebug) {
                this.debugBodyCollidersMeshes[i].material = this.debugColliderMaterial;
            }
            let bodyCollider = this.bodyColliders[i];
            bodyCollider.recomputeWorldCenter();
            let intersections = SphereChuncksIntersection(bodyCollider.center, bodyCollider.radius * this.size, this.chuncks);
            let n = intersections.length;
            for (let j = 0; j < n; j++) {
                let intersection = intersections[j];
                if (intersection.hit) {
                    collideWithTerrain = true;
                    let disp = intersection.normal!.scale(0.5 * intersection.depth / n);
                    this.body.position.addInPlace(disp);
                    this.position.addInPlace(disp.scale(0.5));
                    //let dp = bodyCollider.center.subtract(this.body.position);
                    //let n = intersection.normal!;
                    //let axis = Vector3.Cross(dp, n).normalize();
                    //let angle = 0.5 * intersection.depth;
                    //this.rotate(axis, angle, Space.WORLD);
                    if (this.showCollisionDebug) {
                        this.debugBodyCollidersMeshes[i].material = this.debugColliderHitMaterial;
                    }
                }
            }
        }
        //this.rotate(this.right, 100 * r * dt, Space.LOCAL);
        if (!collideWithTerrain) {
            for (let i = 0; i < this.legCount; i++) {
                if (!this.legs[i].grounded) {
                    this.legs[i].footPos.y -= 1 * dt;
                }
            }
        }
        // [^] Terrain collision
        
        // Prevent overstrech [v]
        let dir = this.position.subtract(this.body.absolutePosition);
        let l = dir.length();
        let maxL = 1 * Math.sqrt(this.size);
        if (l > maxL) {
            dir.scaleInPlace(1 / l);
            this.position.copyFrom(dir).scaleInPlace(maxL).addInPlace(this.body.absolutePosition);
        }

        this.antennas.forEach(antenna => {
            antenna.update(dt);
        })

        if (this.tail) {
            this.tail.update(dt);
        }
        // [^] Prevent overstrech
    }

    public updateBodyCollidersMeshes(): void {
        while (this.debugBodyCollidersMeshes && this.debugBodyCollidersMeshes.length > 0) {
            this.debugBodyCollidersMeshes.pop()?.dispose();
        }

        for (let i = 0; i < this.bodyColliders.length; i++) {
            let collider = this.bodyColliders[i];
            let sphere = MeshBuilder.CreateSphere("bodycollider-" + i, { diameter: 2 * collider.radius });
            sphere.material = this._debugColliderMaterial;
            sphere.position.copyFrom(collider.localCenter);
            sphere.parent = collider.parent ? collider.parent : null;
            sphere.isVisible = this._showCollisionDebug;

            this.debugBodyCollidersMeshes[i] = sphere;
        }

        if (this.tail) {
            this.tail.updateTailColliderMesh();
        }
    }
}