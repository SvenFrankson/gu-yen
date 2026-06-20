import { Mesh } from "@babylonjs/core/Meshes/mesh.pure";
import { HumanLeg } from "./HumanLeg";
import { Scene } from "@babylonjs/core/scene.pure";
import { Ray } from "@babylonjs/core/Culling/ray.pure";
import { Material } from "@babylonjs/core/Materials/material.pure";
import { Axis, Space } from "@babylonjs/core/Maths/math.axis";
import { Color3 } from "@babylonjs/core/Maths/math.color.pure";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector.pure";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Angle, Collider, ColorizeVertexDataInPlace, CreateBeveledBoxVertexData, DrawDebugHit, DrawDebugPoint, ForceDistanceFromOriginInPlace, IsFinite, QuaternionFromXYAxis, QuaternionFromYZAxis, QuaternionFromYZAxisToRef, QuaternionFromZYAxisToRef, RandomInSphereCut, RayCollidersIntersection, SphereCollider, TranslateVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { IsVeryFinite, MinMax } from "../Number";
import { smoothNSec } from "../Tools";
import { Chunck } from "../voxel-engine/Chunck";
import { SphereChuncksIntersection } from "../voxel-engine/TmpMath";
import { Engine } from "@babylonjs/core/Engines/engine.pure";
import { CreateBoxVertexData } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure";
import { ToonMaterial } from "../ToonMaterial";
import { Human } from "./HumanController";
import { HumanArm } from "./HumanArm";
import { easeInOutQuad, easeInOutSine, easeInSine } from "../Easing";
import { HumanoidProp, MoveMode } from "./HumanoidProp";
import { NameTag } from "../ui3D/NameTag";

export class Humanoid extends Mesh {

    public get engine(): Engine {
        return this.getScene().getEngine() as Engine;
    }
    
    private _speed: number = 0;
    public get speed(): number {
        return this._speed;
    }
    private set speed(value: number) {
        this._speed = value;
    }
    public visibleSpeed: number = 0;
    public targetSpeed: number = 0;
    private fSpeed: number = 0;
    private get avgdFSpeed(): number {
        return 0.5 * this.fSpeed + 0.5 * this.speed / this.prop.maxSpeed;
    }

    public moveMode: MoveMode = MoveMode.Walk;
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

    public prop: HumanoidProp;

    public bodyLocalOffset: Vector3 = Vector3.Zero();

    public body: Mesh;
    public torso: Mesh;
    public head: Mesh;
    public leftLeg: HumanLeg;
    public rightLeg: HumanLeg;
    public legs: HumanLeg[] = [];
    public leftArm: HumanArm;
    public rightArm: HumanArm;
    public arms: HumanArm[] = [];

    public color: Color3 = Color3.FromHexString("#208b9e");

    public nameTag: NameTag | null = null;

    private _stepping: number = 0;

    constructor(name: string, prop: HumanoidProp, scene: Scene) {
        super(name, scene);
        
        this.prop = prop;
        this.prop.recompute();

        this.nameTag = new NameTag("nametag", scene);

        let material = new ToonMaterial("drone-material", this.getScene());
        let color = Color3.FromHexString("#208b9e");
        color.r *= 0.7 + 0.6 * Math.random();
        color.g *= 0.7 + 0.6 * Math.random();
        color.b *= 0.7 + 0.6 * Math.random();
        this.color = color;
        material.setDiffuseColor(this.color);
        this.material = material;

        // Create all required meshes
        this.body = new Mesh("body", scene);
        this.body.material = this.material;
        this.body.rotationQuaternion = Quaternion.Identity();

        this.torso = new Mesh("torso", scene);
        this.torso.material = this.material;
        this.torso.rotationQuaternion = Quaternion.Identity();

        this.rightLeg = new HumanLeg(this, false);
        this.leftLeg = new HumanLeg(this, true);
        this.legs = [this.rightLeg, this.leftLeg];

        this.rightArm = new HumanArm(this, false);
        this.leftArm = new HumanArm(this, true);
        this.arms = [this.rightArm, this.leftArm];
        
        this.head = new Mesh("head", scene);
        this.head.material = this.material;
        this.head.rotationQuaternion = Quaternion.Identity();
    }

    public setPosition(p: Vector3): void {
        console.log(p);
        this.position.copyFrom(p);
        let m = this.computeWorldMatrix(true);
        
        Vector3.TransformCoordinatesToRef(this.prop.rightFootTarget, m, this.rightLeg.footTarget);
        Vector3.TransformCoordinatesToRef(this.prop.leftFootTarget, m, this.leftLeg.footTarget);

        this.body.position.copyFrom(this.leftLeg.footTarget).addInPlace(this.rightLeg.footTarget).scaleInPlace(0.5);
        this.body.position.addInPlace(this.up.scale(0.5));

        this.body.computeWorldMatrix(true);

        Vector3.TransformCoordinatesToRef(this.prop.leftHipAnchor, this.body.getWorldMatrix(), this.leftLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.prop.rightHipAnchor, this.body.getWorldMatrix(), this.rightLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.prop.headAnchor, this.body.getWorldMatrix(), this.head.position);
    }

    public async instantiate(): Promise<void> {
        await this.rightLeg.instantiate();
        await this.leftLeg.instantiate();

        await this.rightArm.instantiate();
        await this.leftArm.instantiate();
        
        if (this instanceof Human) {
            this.bodyVertexData?.applyToMesh(this.body);
            this.torsoVertexData?.applyToMesh(this.torso);
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

    private async step(leg: HumanLeg, target: Vector3, targetNorm: Vector3, targetForward: Vector3, updateCallback?: (f: number) => void): Promise<void> {
        return new Promise<void>(resolve => {
            let origin = leg.footTarget.clone();
            let originNorm = leg.footUp.clone();
            let originForward = leg.footForward.clone();
            let destination = target.clone();
            let destinationNorm = targetNorm.clone();
            let destinationForward = targetForward.clone();
            let dist = 1.5 * Vector3.Distance(origin, destination);
            let hMax = Math.min(Math.max(this.prop.walkStyle[this.moveMode].stepHeight * 0.5, dist * 0.5), this.prop.walkStyle[this.moveMode].stepHeight);
            let duration = Math.min(Math.max(this.prop.walkStyle[this.moveMode].stepDuration * 0.5, dist), this.prop.walkStyle[this.moveMode].stepDuration);
            let t = 0;
            leg.stepping = true;
            let easingFactor = this.prop.walkStyle[this.moveMode].stepEasingFactor;
            let footPushStart = 0;
            let footPushEnd = 0.7;
            let animationCB = () => {
                t += this.getScene().getEngine().getDeltaTime() / 1000;
                let f = t / duration;
                f = this.prop.walkStyle[this.moveMode].stepEasing(f) * easingFactor + f * (1 - easingFactor);
                if (f < 1) {
                    let h = Math.sin(f * Math.PI) * hMax;
                    let p = origin.scale(1 - f).addInPlace(destination.scale(f));
                    let n = originNorm.scale(1 - f).addInPlace(destinationNorm.scale(f)).normalize();
                    let forward = originForward.scale(1 - f).addInPlace(destinationForward.scale(f)).normalize();
                    if (f >= footPushStart && f <= footPushEnd) {
                        let footPushFactor = 0;
                        footPushFactor = (f - footPushStart) / (footPushEnd - footPushStart);
                        footPushFactor = Math.sin(footPushFactor * Math.PI);
                        footPushFactor = Math.min(dist, footPushFactor);
                        n.addInPlace(forward.scale(footPushFactor)).normalize();
                    }
                    //let n = this.up;
                    p.y += h;
                    leg.footTarget.copyFrom(p);
                    leg.footUp.copyFrom(n);
                    leg.footForward.copyFrom(forward);
                    if (updateCallback) {
                        updateCallback(f);
                    }
                }
                else {
                    leg.stepping = false;
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

    private _lastBodyPosition: Vector3 = Vector3.Zero();

    private _update = () => {
        let dt = this.engine.getDeltaTime() / 1000;
        if (isNaN(dt)) {
            return;
        }
        
        let bodyPosition = this.body.position.clone();
        let bodyDelta = bodyPosition.subtract(this._lastBodyPosition);
        this._lastBodyPosition.copyFrom(bodyPosition);
        let visibleSpeed = Vector3.Dot(bodyDelta, this.forward) / dt;
        this.visibleSpeed = 0.98 * this.visibleSpeed + 0.02 * visibleSpeed;

        this.speed = 0.95 * this.speed + 0.05 * this.targetSpeed;
        this.speed = Math.max(Math.min(this.speed, this.prop.maxSpeed), 0);
        this.fSpeed = this.visibleSpeed / this.prop.maxSpeed;
        this.fSpeed = Math.max(Math.min(this.fSpeed, 1), 0);

        this.position.addInPlace(this.forward.scale(this.speed * dt));
        this.rotate(Axis.Y, 0.5 * this.rotationSpeed * dt, Space.WORLD);
        this.computeWorldMatrix(true);
        QuaternionFromYZAxisToRef(Axis.Y, this.forward, this.rotationQuaternion!);
        
        Vector3.TransformCoordinatesToRef(this.prop.leftHipAnchor, this.body.getWorldMatrix(), this.leftLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.prop.rightHipAnchor, this.body.getWorldMatrix(), this.rightLeg.hipWorldPosition);
        Vector3.TransformCoordinatesToRef(this.prop.leftShoulderAnchor, this.torso.getWorldMatrix(), this.leftArm.shoulderWorldPosition);
        Vector3.TransformCoordinatesToRef(this.prop.rightShoulderAnchor, this.torso.getWorldMatrix(), this.rightArm.shoulderWorldPosition);
        Vector3.TransformCoordinatesToRef(this.prop.headAnchor, this.body.getWorldMatrix(), this.head.position);

        let m = this.computeWorldMatrix(true);

        if (this._stepping < 1) {
            if (true) {
                let legTarget = Vector3.Zero();
                let longestStepDist = 0;
                let legToMove: HumanLeg;
                let targetPosition: Vector3;
                let targetNormal: Vector3;

                Vector3.TransformCoordinatesToRef(this.prop.rightFootTarget, m, legTarget);
                let targetRight: Vector3 | undefined;
                let normalRight: Vector3 | undefined;

                let origin = legTarget;
                origin.addInPlace(this.forward.scale(this.avgdFSpeed * this.prop.walkStyle[this.moveMode].stepDuration * 1));
                origin.y += 1;
                if (this.showCollisionDebug) {
                    DrawDebugPoint(origin, 3, Color3.Blue(), 0.2);
                }
                let dir = Vector3.Down();
                let ray = new Ray(origin, dir, 3);
                let intersection = RayCollidersIntersection(ray, this.terrain);
                if (intersection.hit) {
                    targetRight = intersection.point!;
                    normalRight = intersection.normal!;
                }
                if (targetRight && !this.rightLeg.stepping) {
                    let d = Vector3.DistanceSquared(this.rightLeg.foot.position, targetRight) / this.prop.totalLegLengthSquared;
                    if (d > longestStepDist) {
                        longestStepDist = d;
                        legToMove = this.rightLeg;
                        targetPosition = targetRight;
                        targetNormal = normalRight!;
                        if (this.showCollisionDebug) {
                            DrawDebugPoint(targetPosition, 60, Color3.Red(), 1);
                        }
                    }
                }

                Vector3.TransformCoordinatesToRef(this.prop.leftFootTarget, m, legTarget);
                //DrawDebugPoint(legTarget, 60, Color3.Blue(), 1);
                let targetLeft: Vector3 | undefined;
                let normalLeft: Vector3 | undefined;

                origin = legTarget;
                origin.addInPlace(this.forward.scale(this.avgdFSpeed * this.prop.walkStyle[this.moveMode].stepDuration * 1));
                origin.y += 1;
                if (this.showCollisionDebug) {
                    DrawDebugPoint(origin, 3, Color3.Blue(), 0.2);
                }
                dir = Vector3.Down();
                ray = new Ray(origin, dir, 3);
                intersection = RayCollidersIntersection(ray, this.terrain);
                if (intersection.hit) {
                    targetLeft = intersection.point!;
                    normalLeft = intersection.normal!;
                }
                if (targetLeft && !this.leftLeg.stepping) {
                    let d = Vector3.DistanceSquared(this.leftLeg.foot.position, targetLeft) / this.prop.totalLegLengthSquared;
                    if (d > longestStepDist) {
                        longestStepDist = d;
                        legToMove = this.leftLeg;
                        targetPosition = targetLeft;
                        targetNormal = normalLeft!;
                        if (this.showCollisionDebug) {
                            DrawDebugPoint(targetPosition, 60, Color3.Red(), 1);
                        }
                    }
                }

                if (longestStepDist > 0.01) {
                    this._stepping++;
                    let once = false;
                    //DrawDebugLine(legToMove.hipWorldPosition, targetPosition, 60, Color3.Yellow());
                    this.step(
                        legToMove!,
                        targetPosition!,
                        targetNormal!.scale(0.3).add(this.up.scale(0.7)),
                        this.forward,
                        (f) => {
                            if (f > this.prop.walkStyle[this.moveMode].stepFSkip) {
                                if (!once) {
                                    once = true;
                                    this._stepping--;
                                }
                            }
                        }
                    ).then(
                        () => {
                            if (!once) {
                                once = true;
                                this._stepping--;
                            }
                        }
                    );
                } 
            }
        }

        this.leftLeg.update();
        this.rightLeg.update();

        let dFoot = this.rightLeg.foot.position.subtract(this.leftLeg.foot.position);
        let dFootZ = Vector3.Dot(dFoot, this.forward) * this.prop.walkStyle[this.moveMode].handAmplitude;
        this.rightArm.handTarget.copyFrom(this.body.position).addInPlace(this.forward.scale(- dFootZ * 0.5)).addInPlace(this.right.scale(0.2)).addInPlace(this.up.scale(this.prop.walkStyle[this.moveMode].handBodyDY));
        this.leftArm.handTarget.copyFrom(this.body.position).addInPlace(this.forward.scale(dFootZ * 0.5)).addInPlace(this.right.scale(- 0.2)).addInPlace(this.up.scale(this.prop.walkStyle[this.moveMode].handBodyDY));

        this.rightArm.update();
        this.leftArm.update();

        let bodyPos = Vector3.Zero();
        let deltaFoot = this.rightLeg.foot.position.subtract(this.leftLeg.foot.position);

        bodyPos.copyFrom(this.rightLeg.footTarget).addInPlace(this.leftLeg.footTarget).scaleInPlace(0.5);
        bodyPos.y = Math.min(this.rightLeg.footTarget.y, this.leftLeg.footTarget.y);

        this.prop.walkStyle[this.moveMode].bodyOffsetUpdate(this.fSpeed, deltaFoot, this.bodyLocalOffset);
        Vector3.TransformNormalToRef(this.bodyLocalOffset, m, this.bodyLocalOffset);
        bodyPos.addInPlace(this.bodyLocalOffset);

        let baseQuat = QuaternionFromYZAxis(Axis.Y, this.forward);

        let bootyXAxis = deltaFoot.clone().normalize();
        let bootyQuat = QuaternionFromXYAxis(bootyXAxis, Axis.Y);
        let bodyQuat = Quaternion.Slerp(baseQuat, bootyQuat, this.prop.walkStyle[this.moveMode].bootyShakiness);

        Quaternion.SlerpToRef(this.body.rotationQuaternion!, bodyQuat, 1 - smoothNSec(1 / dt, 0.1), this.body.rotationQuaternion!);
        
        QuaternionFromZYAxisToRef(this.forward, this.up, this.head.rotationQuaternion!);

        Vector3.LerpToRef(this.body.position, bodyPos, 1 - smoothNSec(1 / dt, 0.1), this.body.position);

        this.torso.position.copyFrom(this.prop.torsoAnchor);
        Vector3.TransformCoordinatesToRef(this.torso.position, this.body.getWorldMatrix(), this.torso.position);
        let handRight = this.rightArm.hand.position.subtract(this.leftArm.hand.position).normalize();
        let quatFromArm = QuaternionFromXYAxis(handRight, Axis.Y);
        let torsoQuat = Quaternion.Slerp(baseQuat, quatFromArm, 0.2);

        Quaternion.SlerpToRef(this.torso.rotationQuaternion!, torsoQuat, 1 - smoothNSec(1 / dt, 0.1), this.torso.rotationQuaternion!);

        // Terrain collision [v]
        let collideWithTerrain = false;
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
        let angle = Angle(this.forward, this.body.forward);
        let angleStrech = (angle - Math.PI / 8) / (Math.PI / 4 - Math.PI / 8);
        angleStrech = Math.min(Math.max(angleStrech, 0), 1);
        let footAnchor = this.body.position.clone();
        footAnchor.y = Math.min(this.leftLeg.footTarget.y, this.rightLeg.footTarget.y);
        this.position.y = this.position.y * 0.9 + footAnchor.y * 0.1;
        let dir = this.position.subtract(footAnchor);
        let l = dir.length();
        let maxL = this.avgdFSpeed + 2 * this.prop.totalLegLength * (1 - angleStrech);
        if (l > maxL) {
            dir.scaleInPlace(1 / l);
            this.position.copyFrom(dir).scaleInPlace(maxL).addInPlace(footAnchor);
        }
        // [^] Prevent overstrech

        if (this.nameTag) {
            this.nameTag.position.x = footAnchor.x;
            this.nameTag.position.y = this.nameTag.position.y * 0.99 + (footAnchor.y + 2) * 0.01;
            this.nameTag.position.z = footAnchor.z;

            let speedDiff = this.speed - this.visibleSpeed;

            this.nameTag.lines = [
                this.name,
                "SpeedDiff " + speedDiff.toFixed(1).padStart(5, " ") + "m/s",
            ];
            this.nameTag.redraw();
        }
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