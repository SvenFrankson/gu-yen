import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Material } from "@babylonjs/core/Materials/material";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Chunck } from "./Chunck";
import { ChunckManager } from "./ChunckManager";
import { ChunckMeshBuilder } from "./ChunckBuilder";
import { TerrainAnalytic } from "./TerrainAnalytic";
import { GameSave } from "./Save/GameSave";
import { IChunckGeneratorProperties, ChunckDataGenerator, GeneratorType } from "./TerrainGen/ChunckDataGenerator";
import { ChunckDataGeneratorFromSave } from "./TerrainGen/ChunckDataGeneratorFromSave";
import { FloorPow2Exponent, Pow2 } from "../Number";
import { BlockType } from "./BlockType";
import { ChunckDataGeneratorFactory } from "./TerrainGen/ChunckDataGeneratorFactory";
import { GeoConverter } from "../map/Geo";

export interface ITerrainProperties {
    //randSeed?: Nabu.RandSeed,
    generatorProps?: IChunckGeneratorProperties,
    maxDisplayedLevel?: number,
    blockSizeIJ_m?: number,
    blockSizeK_m?: number,
    chunckLengthIJ?: number,
    chunckLengthK?: number,
    chunckCountIJ?: number,
    chunckCountK?: number,
    useAnalytics?: boolean
    useLocalStorage?: boolean;
    fullRenderMode?: boolean;
    finiteEdges?: boolean;
}

export class Terrain {

    //public randSeed: Nabu.RandSeed;
    public chunckDataGenerator: ChunckDataGenerator;
    public chunckDataGeneratorSave: ChunckDataGeneratorFromSave;
    public useAnalytics: boolean = false;
    public useLocalStorage: boolean = false;

    private _analytic: TerrainAnalytic | undefined;
    public get analytic(): TerrainAnalytic {
        if (!this._analytic) {
            this._analytic = new TerrainAnalytic(this);
        }
        return this._analytic;
    }

    public readonly maxLevel: number = 10;
    public readonly maxDisplayedLevel: number = 1;
    public readonly blockSizeIJ_m: number = 1;
    public readonly blockSizeK_m: number = 1;
    public readonly chunckLengthIJ: number = 16;
    public readonly chunckLengthK: number = 128;
    public readonly chunckSizeIJ_m: number;
    public readonly chunckSizeK_m: number;
    public readonly chunckCountIJ: number = 1024;
    public readonly terrainLengthIJ: number;
    public readonly halfTerrainLengthIJ: number;
    public readonly terrainSizeIJ_m: number;
    public readonly halfTerrainSizeIJ_m: number;
    public readonly terrainLengthK: number;
    public readonly halfTerrainLengthK: number;
    public readonly terrainSizeK_m: number;
    public readonly halfTerrainSizeK_m: number;
    public readonly finiteEdges: boolean = false;

    public generatorProps: GeneratorType = GeneratorType.NotAGenerator;

    public root: Chunck | undefined;
    public geoConverter: GeoConverter;
    public chunckManager: ChunckManager;
    public chunckBuilder: ChunckMeshBuilder;
    public save: GameSave;
    public scene: Scene;

    public sunDir: Vector3 = Vector3.Up();

    //private materials: TerrainMaterial[];
    public materials: Material[];
    public highlightMaterial: StandardMaterial;
    //public testMaterials: TerrainMaterial[];
    public testMaterials: StandardMaterial[];

    public static CreateFromSave(save: GameSave): Terrain {
        let terrain = new Terrain(save.data.terrain.prop);
        terrain.save = save;

        return terrain;
    }

    constructor(prop: ITerrainProperties, scene?: Scene) {
        if (!scene) {
            this.scene = Engine.Instances[0].scenes[0];
        }
        else {
            this.scene = scene;
        }

        /*
        if (!prop.randSeed) {
            this.randSeed = new Nabu.RandSeed("undefin");
        }
        else {
            this.randSeed = prop.randSeed;
        }
        */

        if (prop.useAnalytics) {
            this.useAnalytics = prop.useAnalytics;
        }

        if (typeof(prop.maxDisplayedLevel) === "number") {
            this.maxDisplayedLevel = prop.maxDisplayedLevel;
        }
        if (typeof(prop.blockSizeIJ_m) === "number") {
            this.blockSizeIJ_m = prop.blockSizeIJ_m;
        }
        if (typeof(prop.blockSizeK_m) === "number") {
            this.blockSizeK_m = prop.blockSizeK_m;
        }
        if (typeof(prop.chunckLengthIJ) === "number") {
            this.chunckLengthIJ = prop.chunckLengthIJ;
        }
        if (typeof(prop.chunckLengthK) === "number") {
            this.chunckLengthK = prop.chunckLengthK;
        }
        if (typeof(prop.chunckCountIJ) === "number") {
            this.maxLevel = FloorPow2Exponent(prop.chunckCountIJ);
        }
        this.chunckCountIJ = Pow2(this.maxLevel);

        this.chunckSizeIJ_m = this.chunckLengthIJ * this.blockSizeIJ_m;
        this.chunckSizeK_m = this.chunckLengthK * this.blockSizeK_m;
        
        this.terrainLengthIJ = this.chunckCountIJ * this.chunckLengthIJ;
        this.halfTerrainLengthIJ = Math.floor(this.terrainLengthIJ * 0.5);
        this.terrainSizeIJ_m = this.terrainLengthIJ * this.blockSizeIJ_m;
        this.halfTerrainSizeIJ_m = Math.floor(this.terrainSizeIJ_m * 0.5);
        
        this.terrainLengthK = this.chunckLengthK;
        this.halfTerrainLengthK = Math.floor(this.terrainLengthK * 0.5);
        this.terrainSizeK_m = this.terrainLengthK * this.blockSizeK_m;
        this.halfTerrainSizeK_m = Math.floor(this.terrainSizeK_m * 0.5);

        if (prop.finiteEdges) {
            this.finiteEdges = true;
        }

        this.geoConverter = new GeoConverter();

        this.materials = [
            new StandardMaterial("terrain-material-lod0", this.scene),
        ];
        //this.materials[0].diffuseColor.copyFromFloats(1, 0.5, 0.5);
        //this.materials[1].diffuseColor.copyFromFloats(0.5, 1, 0.5);
        //this.materials[2].diffuseColor.copyFromFloats(0.5, 0.5, 1);
        //this.materials[3].diffuseColor.copyFromFloats(1, 1, 0.5);
        //this.materials[4].diffuseColor.copyFromFloats(0.5, 1, 1);
        //this.materials[5].diffuseColor.copyFromFloats(1, 0.5, 1);
        (this.materials[0] as StandardMaterial).diffuseColor.copyFromFloats(1, 1, 1);
        (this.materials[0] as StandardMaterial).specularColor.copyFromFloats(0, 0, 0);
        //this.materials[0].setLevel(0);
        //this.materials[1].setLevel(1);
        //this.materials[2].setLevel(2);
        this.highlightMaterial = new StandardMaterial("hightlight-material");
        this.highlightMaterial.diffuseColor.copyFromFloats(1, 0, 0);
        this.highlightMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.testMaterials = [];
        for (let i = 0; i < 6; i++) {
            this.testMaterials[i] = new StandardMaterial("terrain-shell-material", this.scene);
        }

        this.chunckManager = new ChunckManager({
            scene: this.scene,
            terrain: this,
            fullRenderMode: prop.fullRenderMode
        });

        this.chunckBuilder = new ChunckMeshBuilder(this);

        this.chunckDataGenerator = ChunckDataGeneratorFactory.CreateGenerator(this, prop.generatorProps ? prop.generatorProps : { type: GeneratorType.Flat, blockType: BlockType.Grass });
        this.useLocalStorage = prop.useLocalStorage ? true : false;
        this.chunckDataGeneratorSave = new ChunckDataGeneratorFromSave(this);

        this.save = new GameSave(prop);
    }

    public initialize(): void {
        this.chunckManager.initialize();
        this.root = new Chunck(0, 0, this);
        this.root.register();
    }

    public dispose(): void {
        this.chunckManager.dispose();
        this.root?.dispose();
    }

    public getMaterial(lod: number): Material {
        return this.materials[Math.min(lod, this.materials.length - 1)];
    }

    public customChunckMaterialSet?: (chunck: Chunck) => void;

    public getChunck(level: number, iPos: number, jPos: number): Chunck | undefined {
        return this.root?.getChunck(level, iPos, jPos);
    }

    public getChunckAtPos(pos: Vector3, level: number): Chunck | undefined {
        let iPos = Math.floor((pos.x + this.halfTerrainSizeIJ_m) / this.chunckSizeIJ_m);
        let jPos = Math.floor((pos.z + this.halfTerrainSizeIJ_m) / this.chunckSizeIJ_m);
        return this.getChunck(level, iPos, jPos);
    }

    public getChunckAndIJKAtPos(pos: Vector3, level: number, centerOnEvenIJK?: boolean): { chunck: Chunck, ijk: { i: number, j: number, k: number } } | undefined {
        let chunck = this.getChunckAtPos(pos, level);
        if (chunck) {
            return {
                chunck: chunck,
                ijk: centerOnEvenIJK ? chunck.getEvenIJKAtPos(pos) : chunck.getIJKAtPos(pos)
            }
        }
    }

    public worldPosToGlobalIJK(pos: Vector3): { i: number, j: number, k: number } {
        let i = Math.floor((pos.x + this.halfTerrainSizeIJ_m) / this.blockSizeIJ_m);
        let j = Math.floor((pos.z + this.halfTerrainSizeIJ_m) / this.blockSizeIJ_m);
        let k = Math.floor((pos.y) / this.blockSizeK_m);
        return { i, j, k };
    }

    public saveToLocalStorage(): void {
        window.localStorage.setItem("saved-terrain", this.save.serialize());
    }
}
