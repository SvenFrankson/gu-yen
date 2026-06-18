import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { HumanLeg } from "./HumanLeg";
import { Scene } from "@babylonjs/core/scene.pure";
import { Ray } from "@babylonjs/core/Culling/ray.pure";
import { Material } from "@babylonjs/core/Materials/material.pure";
import { Axis, Space } from "@babylonjs/core/Maths/math.axis";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector.pure";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Collider, ColorizeVertexDataInPlace, CreateBeveledBoxVertexData, DrawDebugHit, DrawDebugPoint, ForceDistanceFromOriginInPlace, IsFinite, QuaternionFromXYAxis, QuaternionFromYZAxis, QuaternionFromYZAxisToRef, QuaternionFromZYAxisToRef, RandomInSphereCut, RayCollidersIntersection, SphereCollider, TranslateVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { IsVeryFinite, MinMax } from "../Number";
import { smoothNSec } from "../Tools";
import { Chunck } from "../voxel-engine/Chunck";
import { SphereChuncksIntersection } from "../voxel-engine/TmpMath";
import { Engine } from "@babylonjs/core/Engines/engine.pure";
import { CreateBoxVertexData } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure";
import { ToonMaterial } from "../ToonMaterial";
import { Human } from "./Human";

export interface IHumanoidProps {
    hipAnchor?: Vector3;
    footTarget?: Vector3;
    footThickness?: number;
    upperLegLength?: number;
    lowerLegLength?: number;
    stepDuration?: number;
    stepDurationMin?: number;
    stepDurationMax?: number;
    stepHeight?: number;
    stepHeightMin?: number;
    stepHeightMax?: number;
    stepSimultaneousMaxCount?: number;
    bootyShakiness?: number;
    bodyLocalOffset?: Vector3;
    headAnchor?: Vector3;
}

export class Humanoid extends Mesh {

    public get engine(): Engine {
        return this.getScene().getEngine() as Engine;
    }
    
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
    

    public povOffset: Vector3 = new Vector3(0, 0, 0);
    public povAlpha: number = 5 * Math.PI / 3;
    public povBetaMin: number = Math.PI / 10;
    public povBetaMax: number = Math.PI / 2.1;
    public povRadiusMax: number = 3;
    public povRadiusMin: number = 0.2;

    public mentalCheckPerFrame: number = 0;

    public headAnchor: Vector3 = new Vector3(0, Math.SQRT2, Math.SQRT2);

    public rightHipAnchor: Vector3;
    public leftHipAnchor: Vector3;

    public rightFootTarget: Vector3;
    public leftFootTarget: Vector3;
    public setFootTarget(v: Vector3, index: number): void {
        this.rightFootTarget.copyFrom(v);
        this.leftFootTarget.copyFrom(v);
        this.leftFootTarget.x *= -1;
    }

    private _footThickness: number = 1.2;
    public get footThickness(): number {
        return this._footThickness;
    }
    public setFootThickness(v: number) {
        this._footThickness = v;
        this.rightLeg.footThickness = this._footThickness;
        this.leftLeg.footThickness = this._footThickness;
    }
    
    public stepDurationMin: number = 0.3;
    public stepDurationMax: number = 0.7;
    public stepHeightMin: number = 0.2;
    public stepHeightMax: number = 0.7;
    public bootyShakiness: number = 0.5;

    public bodyLocalOffset: Vector3 = Vector3.Zero();

    public body: Mesh;
    public head: Mesh;
    public leftLeg: HumanLeg;
    public rightLeg: HumanLeg;
    public legs: HumanLeg[] = [];

    public color: Color3 = Color3.FromHexString("#208b9e");

    private _stepping: number = 0;

    constructor(name: string, prop: IHumanoidProps, scene: Scene) {
        super(name, scene);

        let material = new ToonMaterial("drone-material", this.getScene());
        let color = Color3.FromHexString("#208b9e");
        color.r *= 0.7 + 0.6 * Math.random();
        color.g *= 0.7 + 0.6 * Math.random();
        color.b *= 0.7 + 0.6 * Math.random();
        this.color = color;
        this.material = material;

        // Create all required meshes
        this.body = new Mesh("body", scene);
        this.body.material = this._debugColliderMaterial;
        this.body.rotationQuaternion = Quaternion.Identity();
        setTimeout(() => {
            console.log(this.body)
        }, 3000);

        this.rightLeg = new HumanLeg(this, false);
        this.leftLeg = new HumanLeg(this, true);
        this.legs = [this.rightLeg, this.leftLeg];
        
        this.head = new Mesh("head", scene);
        this.head.material = this._debugColliderMaterial;
        this.head.rotationQuaternion = Quaternion.Identity();

        // Apply properties
        if (IsFinite(prop.headAnchor!)) {
            this.headAnchor = prop.headAnchor!;
        }
        
        if (prop.hipAnchor) {
            // HipAnchors provided
            this.rightHipAnchor = prop.hipAnchor.clone();
            this.leftHipAnchor = prop.hipAnchor.clone();
            this.leftHipAnchor.x *= -1;
        }
        else {
            this.rightHipAnchor = new Vector3(0.25, 0, 0);
            this.leftHipAnchor = new Vector3(-0.25, 0, 0);
        }
        
        if (prop.footTarget) {
            // FootTargets provided
            this.rightFootTarget = prop.footTarget.clone();
            this.leftFootTarget = prop.footTarget.clone();
            this.leftFootTarget.x *= -1;
        }
        else {
            this.rightFootTarget = new Vector3(0.3, 0, 0);
            this.leftFootTarget = new Vector3(-0.3, 0, 0);
        }

        if (isFinite(prop.footThickness!)) {
            this.rightLeg.footThickness = prop.footThickness!;
            this.leftLeg.footThickness = prop.footThickness!;
        }

        if (isFinite(prop.upperLegLength!)) {
            this.rightLeg.upperLegLength = prop.upperLegLength!;
            this.leftLeg.upperLegLength = prop.upperLegLength!;
        }

        if (isFinite(prop.lowerLegLength!)) {
            this.rightLeg.lowerLegLength = prop.lowerLegLength!;
            this.leftLeg.lowerLegLength = prop.lowerLegLength!;
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
            this.stepHeightMin = prop.stepHeight!;
            this.stepHeightMax = prop.stepHeight!;
        }
        if (isFinite(prop.stepHeightMin!)) {
            this.stepHeightMin = prop.stepHeightMin!;
        }
        if (isFinite(prop.stepHeightMax!)) {
            this.stepHeightMax = prop.stepHeightMax!;
        }
        
        if (isFinite(prop.bootyShakiness!)) {
            this.bootyShakiness = prop.bootyShakiness!;
        }

        if (IsFinite(prop.bodyLocalOffset!)) {
            this.bodyLocalOffset = prop.bodyLocalOffset!;
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
        console.log(p);
        this.position.copyFrom(p);
        let m = this.computeWorldMatrix(true);
        
        Vector3.TransformCoordinatesToRef(this.rightFootTarget, m, this.rightLeg.footTarget);
        Vector3.TransformCoordinatesToRef(this.leftFootTarget, m, this.leftLeg.footTarget);

        this.body.position.copyFrom(this.leftLeg.footTarget).addInPlace(this.rightLeg.footTarget).scaleInPlace(0.5);
        this.body.position.addInPlace(this.up.scale(0.5));

        this.body.computeWorldMatrix(true);

        Vector3.TransformCoordinatesToRef(this.leftHipAnchor, this.body.getWorldMatrix(), this.leftLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.rightHipAnchor, this.body.getWorldMatrix(), this.rightLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.headAnchor, this.body.getWorldMatrix(), this.head.position);
    }

    public async instantiate(): Promise<void> {
        await this.rightLeg.instantiate();
        await this.leftLeg.instantiate();
        
        if (this instanceof Human) {
            this.bodyVertexData?.applyToMesh(this.body);
        }
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

    private async step(leg: HumanLeg, target: Vector3, targetNorm: Vector3, targetForward: Vector3): Promise<void> {
        return new Promise<void>(resolve => {
            let origin = leg.footTarget.clone();
            let originNorm = leg.footUp.clone();
            let originForward = leg.footForward.clone();
            let destination = target.clone();
            let destinationNorm = targetNorm.clone();
            let destinationForward = targetForward.clone();
            let dist = 1.5 * Vector3.Distance(origin, destination);
            let hMax = Math.min(Math.max(this.stepHeightMin, dist), this.stepHeightMax);
            let duration = Math.min(Math.max(this.stepDurationMin, dist), this.stepDurationMax);
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
                    leg.footTarget.copyFrom(p);
                    leg.footUp.copyFrom(n);
                    leg.footForward.copyFrom(forward);
                }
                else {
                    leg.footTarget.copyFrom(destination);
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
        let dt = this.engine.getDeltaTime() / 1000;
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
            let distCheck = this.povRadiusMax;
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

        let footUps = this.legs.map(leg => leg.footUp).reduce((a, b) => a.add(b)).scaleInPlace(0.5);
        this.localNormal = Vector3.SlerpToRef(this.localNormal, footUps, 1, this.localNormal);
        // [^] Terrain scan

        Vector3.TransformCoordinatesToRef(this.leftHipAnchor, this.body.getWorldMatrix(), this.leftLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.rightHipAnchor, this.body.getWorldMatrix(), this.rightLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.headAnchor, this.body.getWorldMatrix(), this.head.position);

        let m = this.computeWorldMatrix(true);

        if (this._stepping < 1) {
            if (true) {
                let legTarget = Vector3.Zero();
                let longestStepDist = 0;
                let legToMove: HumanLeg;
                let targetPosition: Vector3;
                let targetNormal: Vector3;

                Vector3.TransformCoordinatesToRef(this.rightFootTarget, m, legTarget);
                let targetRight: Vector3 | undefined;
                let normalRight: Vector3 | undefined;
                let closestMentalMapSqrDist = Infinity;

                let origin = legTarget;
                legTarget.y += 1.5;
                let dir = Vector3.Down();
                let ray = new Ray(origin, dir, 3);
                let intersection = RayCollidersIntersection(ray, this.terrain);
                if (intersection.hit) {
                    targetRight = intersection.point!;
                    normalRight = intersection.normal!;
                }
                for (let j = 0; j < this.mentalMap.length; j++) {
                    let mentalPoint = this.mentalMap[j];
                    let sqrD = Vector3.DistanceSquared(legTarget, mentalPoint);
                    if (sqrD < closestMentalMapSqrDist) {
                        if (Vector3.Distance(this.rightLeg.hipWorldPosition, mentalPoint) < this.rightLeg.totalLength * 3) {
                            targetRight = mentalPoint;
                            normalRight = this.mentalMapNormal[j];
                            closestMentalMapSqrDist = sqrD;
                        }
                    }
                }
                if (targetRight) {
                    let d = Vector3.DistanceSquared(this.rightLeg.foot.position, targetRight) / this.rightLeg.totalLengthSquared;
                    if (d > longestStepDist) {
                        longestStepDist = d;
                        legToMove = this.rightLeg;
                        targetPosition = targetRight;
                        targetNormal = normalRight!;
                        DrawDebugPoint(targetPosition, 60, Color3.Red(), 1);
                    }
                }

                Vector3.TransformCoordinatesToRef(this.leftFootTarget, m, legTarget);
                //DrawDebugPoint(legTarget, 60, Color3.Blue(), 1);
                let targetLeft: Vector3 | undefined;
                let normalLeft: Vector3 | undefined;
                closestMentalMapSqrDist = Infinity;

                origin = legTarget;
                legTarget.y += 1.5;
                dir = Vector3.Down();
                ray = new Ray(origin, dir, 3);
                intersection = RayCollidersIntersection(ray, this.terrain);
                if (intersection.hit) {
                    targetLeft = intersection.point!;
                    normalLeft = intersection.normal!;
                }
                for (let j = 0; j < this.mentalMap.length; j++) {
                    let mentalPoint = this.mentalMap[j];
                    let sqrD = Vector3.DistanceSquared(legTarget, mentalPoint);
                    if (sqrD < closestMentalMapSqrDist) {
                        if (Vector3.Distance(this.leftLeg.hipWorldPosition, mentalPoint) < this.leftLeg.totalLength * 3) {
                            targetLeft = mentalPoint;
                            normalLeft = this.mentalMapNormal[j];
                            closestMentalMapSqrDist = sqrD;
                        }
                    }
                }
                if (targetLeft) {
                    let d = Vector3.DistanceSquared(this.leftLeg.foot.position, targetLeft) / this.leftLeg.totalLengthSquared;
                    if (d > longestStepDist) {
                        longestStepDist = d;
                        legToMove = this.leftLeg;
                        targetPosition = targetLeft;
                        targetNormal = normalLeft!;
                        DrawDebugPoint(targetPosition, 60, Color3.Red(), 1);
                    }
                }

                if (longestStepDist > 0.01) {
                    this._stepping++;
                    //DrawDebugLine(legToMove.hipWorldPosition, targetPosition, 60, Color3.Yellow());
                    this.step(legToMove!, targetPosition!, targetNormal!.scale(0.3).add(this.up.scale(0.7)), this.forward).then(
                        () => {
                            this._stepping--;
                        }
                    );
                } 
            }
        }

        this.leftLeg.update();
        this.rightLeg.update();

        let bodyPos = Vector3.Zero();

        this.bodyLocalOffset.copyFromFloats(0, this.rightLeg.totalLength * 0.95, 0);
        this.bodyLocalOffset.addInPlace(this.forward.scale(0.1 * this._fSpeed));

        bodyPos.copyFrom(this.rightLeg.footTarget).addInPlace(this.leftLeg.footTarget).scaleInPlace(0.5);
        bodyPos.y = Math.min(this.rightLeg.footTarget.y, this.leftLeg.footTarget.y);
        bodyPos.addInPlace(this.bodyLocalOffset);


        let footRight = this.rightLeg.foot.position.subtract(this.leftLeg.foot.position).normalize();
        let quatFromLeg = QuaternionFromYZAxis(Axis.Y, this.forward);
        let quatFromLeg2 = QuaternionFromXYAxis(footRight, this.localNormal);
        let quat = Quaternion.Slerp(quatFromLeg, quatFromLeg2, 0.2);

        Quaternion.SlerpToRef(this.body.rotationQuaternion!, quat, 1 - smoothNSec(1 / dt, 0.1), this.body.rotationQuaternion!);
        
        QuaternionFromZYAxisToRef(this.forward, this.up, this.head.rotationQuaternion!);

        Vector3.LerpToRef(this.body.position, bodyPos, 1 - smoothNSec(1 / dt, 0.1), this.body.position);

        //console.log(this.body.position, this.position);

        // Terrain collision [v]
        let collideWithTerrain = false;
        let r = 0;
        for (let i = 0; i < this.bodyColliders.length; i++) {
            if (this.showCollisionDebug) {
                this.debugBodyCollidersMeshes[i].material = this.debugColliderMaterial;
            }
            let bodyCollider = this.bodyColliders[i];
            bodyCollider.recomputeWorldCenter();
            let intersections = SphereChuncksIntersection(bodyCollider.center, bodyCollider.radius, this.chuncks);
            let n = intersections.length;
            for (let j = 0; j < n; j++) {
                let intersection = intersections[j];
                if (intersection.hit) {
                    collideWithTerrain = true;
                    let disp = intersection.normal!.scale(0.1 * intersection.depth / n);
                    this.body.position.addInPlace(disp);
                    this.position.addInPlace(disp.scale(0.1));
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
            if (!this.leftLeg.grounded) {
                this.leftLeg.footTarget.y -= 1 * dt;
            }
            if (!this.rightLeg.grounded) {
                this.rightLeg.footTarget.y -= 1 * dt;
            }
        }
        // [^] Terrain collision
        
        // Prevent overstrech [v]
        let footAnchor = this.body.position.clone();
        footAnchor.y = Math.min(this.leftLeg.footTarget.y, this.rightLeg.footTarget.y);
        let dir = this.position.subtract(footAnchor);
        let l = dir.length();
        let maxL = 1;
        if (l > maxL) {
            dir.scaleInPlace(1 / l);
            this.position.copyFrom(dir).scaleInPlace(maxL).addInPlace(footAnchor);
        }
        // [^] Prevent overstrech
    }

    public updateBodyCollidersMeshes(): void {
        while (this.debugBodyCollidersMeshes && this.debugBodyCollidersMeshes.length > 0) {
            this.debugBodyCollidersMeshes.pop()?.dispose();
        }

        for (let i = 0; i < this.bodyColliders.length; i++) {
            let collider = this.bodyColliders[i];
            let sphere = MeshBuilder.CreateSphere("bodycollider-" + i, { diameter: 2 * collider.radius }, this.getScene());
            sphere.material = this._debugColliderMaterial;
            sphere.position.copyFrom(collider.localCenter);
            sphere.parent = collider.parent ? collider.parent : null;
            sphere.isVisible = this._showCollisionDebug;

            this.debugBodyCollidersMeshes[i] = sphere;
        }
    }
}