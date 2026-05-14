import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GetGLTFMeshDataArray } from "../VertexDataUtils";
import { Color3, MeshBuilder, PhysicsBody, PhysicsMotionType, PhysicsShapeConvexHull, Plane, Ray, Space, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { Chunck } from "../voxel-engine/Chunck";
import { AngleFromToAround, Rotate, RotateInPlace } from "babylonjs-geometry-kit";
import { BlockType } from "../voxel-engine/BlockType";
import { FloatingBlocksDetector } from "../voxel-engine/FloatingBlocksDetector";
import { MakeStandardMaterial } from "../MaterialUtils";
import { IsVeryFinite, StepAngle } from "../Number";
import { TerrainMaterial } from "../TerrainMaterial";
import { Player } from "../player/Player";
import { ToonMaterial } from "../ToonMaterial";
import { IVehicle, Vehicle, VehiclePart } from "./Vehicle";

export class Car extends Vehicle implements IVehicle {
    
    public base: VehiclePart;
    public wheels: VehiclePart[] = [];

    constructor(position: Vector3, game: Game) {
        super(position, game);

        this.throttlePower = 1;
        this.throttleSmoothNSec = 4;
        this.turnPower = 4;
        this.height = 0.2;

        this.position.copyFrom(position);
        
        let toonMaterial = new ToonMaterial("test", game.scene);
        this.material = toonMaterial;

        this.base = new VehiclePart("car_base", this);
        this.base.material = this.material;
        this.base.parent = this;

        this.head.position.y += 1;
        this.head.rotation.y = this.rotation.y + AngleFromToAround(Vector3.Forward(), Vector3.Normalize(new Vector3(this.forward.x, 0, this.forward.z)), Vector3.Up());
        this.head.visibility = 0.5;

        for (let i = 0; i < 4; i++) {
            let wheel = new VehiclePart("car_wheel" + i, this);
            wheel.material = this.material;
            wheel.parent = this.base;
            this.wheels.push(wheel);
        }
    }

    public async instantiate(): Promise<void> {
        await super.instantiate();
        let dataArray = await GetGLTFMeshDataArray("meshes/car.gltf", this.getScene());
        
        if (dataArray) {
            dataArray[1].vertexData.applyToMesh(this.base);

            dataArray[2].vertexData.applyToMesh(this.wheels[0]);
            this.wheels[0].position = dataArray[2].position.clone();
            
            dataArray[3].vertexData.applyToMesh(this.wheels[1]);
            this.wheels[1].position = dataArray[3].position.clone();

            dataArray[4].vertexData.applyToMesh(this.wheels[2]);
            this.wheels[2].position = dataArray[4].position.clone();

            dataArray[5].vertexData.applyToMesh(this.wheels[3]);
            this.wheels[3].position = dataArray[5].position.clone();
        }
    }

    public specificUpdate(): void {
        if (this.game.terrain && this.controler) {
            this.head.position.copyFrom(this.absolutePosition);
            this.head.position.y += 1;
            this.head.rotation.y = this.rotation.y + AngleFromToAround(Vector3.Forward(), Vector3.Normalize(new Vector3(this.forward.x, 0, this.forward.z)), Vector3.Up());
        }
    }
}