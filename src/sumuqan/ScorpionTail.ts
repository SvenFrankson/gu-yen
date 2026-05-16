import { Vector3, Mesh, Axis, MeshBuilder } from "@babylonjs/core";
import { SphereCollider, QuaternionFromZYAxis, SphereCollidersIntersection } from "babylonjs-tiaratumgames-tools";
import { Polypode } from "./Polypode";
import { MinMax } from "../Number";

    export interface IScorpionTailProps {
        length: number;
        anchor?: 
        Vector3;
        localDir?: 
        Vector3;
        dist?: number;
        distances?: number[];
        distGeometricFactor?: number;
    }

    export class ScorpionTail extends 
    Mesh {

        public tailCollider: SphereCollider | null = null;

        public lace: number = 0;
        public laceSpeed: number = 0;
        public roll: number = 0;
        public rollSpeed: number = 0;
        public roll0: number = 0;
        public length: number = 0.5;

        public tailSegments: Mesh[] = [];
        public debugColliderMesh: Mesh | null = null;
        
        constructor(public polypode: Polypode, props: IScorpionTailProps) {
            super(polypode.name + "-tail-root");
            this.parent = this.polypode.body;

            if (props.anchor) {
                this.position.copyFrom(props.anchor);
            }
            if (props.localDir) {
                this.rotationQuaternion = QuaternionFromZYAxis(props.localDir, 
                    Axis.Y);
            }
            else {
                this.rotationQuaternion = QuaternionFromZYAxis(new 
                    Vector3(0, 0, -1), 
                Axis.Y);
            }

            let d = 0.3;
            if (isFinite(props.dist!)) {
                d = props.dist!;
            }
            this.tailSegments[0] = new 
            Mesh("tail-0");
            this.tailSegments[0].parent = this;
            for (let i = 1; i < props.length; i++) {
                this.tailSegments[i] = new 
                Mesh("tail-" + i);
                this.tailSegments[i].parent = this.tailSegments[i - 1];
                if (props.distances) {
                    this.tailSegments[i].position.z = props.distances[i];
                }
                else {
                    this.tailSegments[i].position.z = d;
                    if (isFinite(props.distGeometricFactor!)) {
                        d *= props.distGeometricFactor!;
                    }
                }
            }

            let updateTailRollTarget = () => {
                this.roll0 = Math.PI / 2 * Math.random();
                setTimeout(updateTailRollTarget, 5000 + Math.random() * 15000);
            }
            updateTailRollTarget();
        }

        public update(dt: number): void {
            if (isFinite(dt)) {
                if (this.debugColliderMesh) {
                    this.debugColliderMesh.material = this.polypode.debugColliderMaterial;
                }
                this.tailCollider!.recomputeWorldCenter();
                let intersections = SphereCollidersIntersection(this.tailCollider!.center, this.tailCollider!.radius, this.polypode.terrain);
                let n = intersections.length;
                for (let j = 0; j < n; j++) {
                    let intersection = intersections[j];
                    if (intersection.hit) {
                        let n = intersection.normal;
                        let dir = this.tailCollider!.center.subtract(intersection.point!).normalize().addInPlace(n!).normalize();
                        let dotUp = 
                        Vector3.Dot(dir, this.polypode.up);
                        let dotRight = 
                        Vector3.Dot(dir, this.polypode.right);
                        
                        this.rollSpeed += Math.PI * 0.1 * dotUp;
                        this.laceSpeed -= Math.PI * 0.1 * dotRight;

                        if (this.polypode.showCollisionDebug && this.debugColliderMesh) {
                            this.debugColliderMesh.material = this.polypode.debugColliderHitMaterial;
                        }
                    }
                }

                this.laceSpeed -= 0.01 * this.lace;
                this.rollSpeed -= 0.01 * (this.roll - this.roll0);

                this.laceSpeed *= 0.95;
                this.rollSpeed *= 0.95;
    
                this.roll += this.rollSpeed * dt;
                this.roll = MinMax(this.roll, 0, Math.PI / 2);
                this.lace += this.laceSpeed * dt;
                this.lace = MinMax(this.lace, - Math.PI / 3, Math.PI / 3);

                this.tailSegments[0].rotation.x = - Math.PI / 5 * this.roll;
                this.tailSegments[0].rotation.z = - Math.PI / 8 * this.lace;
                for (let i = 1; i < 7; i++) {
                    this.tailSegments[i].rotation.x = - Math.PI / 6 * this.roll;
                    let f = 1 - i / 6;
                    this.tailSegments[i].rotation.z = - Math.PI / 8 * this.lace * f * f;
                }    
            }
        }

        public updateTailColliderMesh(): void {
            if (this.tailCollider) {
                if (this.debugColliderMesh) {
                    this.debugColliderMesh.dispose();
                }
                this.debugColliderMesh = MeshBuilder.CreateSphere("tail-collider", { diameter: 2 * this.tailCollider.radius });
                this.debugColliderMesh.material = this.polypode.debugColliderMaterial;
                if (this.tailCollider.parent) {
                    this.debugColliderMesh.parent = this.tailCollider.parent;
                }
                this.debugColliderMesh.isVisible = this.polypode.showCollisionDebug;
        }
        }
    }