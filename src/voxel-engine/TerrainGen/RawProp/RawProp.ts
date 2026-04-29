import { IJK, IsVeryFinite } from "../../../Number";
import { BlockType } from "../../BlockType";
import { Chunck } from "../../Chunck";
import { RawShape, RawShapeBox, RawShapeSphere, RawShapeLine, RawShapeDot } from "../RawShape/RawShape";

enum RawShapeType {
    Box,
    Sphere,
    Dot,
    Line
}

interface IRawShapeData {
    type: RawShapeType;
    i: number;
    j: number;
    k: number;
    w?: number;
    d?: number;
    h?: number;
    r?: number;
    rX?: number;
    rZ?: number;
    rY?: number;
    Ai?: number;
    Aj?: number;
    Ak?: number;
    Bi?: number;
    Bj?: number;
    Bk?: number;
    dots?: IJK[];
}

interface IRawCoumpoundPropData {
    blocks: BlockType[];
    shapes: IRawShapeData[];
}

export abstract class RawProp {
    
    public abstract draw(i: number, j: number, k: number, chunck: Chunck): void;
}

export class RawCoumpoundProp extends RawProp {

    public blocks: BlockType[] = [];
    public shapes: RawShape[] = [];

    public draw(i: number, j: number, k: number, chunck: Chunck): void {
        for (let n = 0; n < this.blocks.length; n++) {
            this.shapes[n].draw(this.blocks[n], i, j, k, chunck);
        }
    }

    public serialize(): IRawCoumpoundPropData {
        let data: IRawCoumpoundPropData = {
            blocks: [],
            shapes: []
        }

        data.blocks = this.blocks;
        for (let i = 0; i < this.shapes.length; i++) {
            let shape = this.shapes[i];
            if (shape instanceof RawShapeBox) {
                let shapeData: IRawShapeData = {
                    type: RawShapeType.Box,
                    i: shape.pi,
                    j: shape.pj,
                    k: shape.pk,
                    w: shape.w,
                    d: shape.d,
                    h: shape.h,
                }
                data.shapes.push(shapeData);
            }
            else if (shape instanceof RawShapeSphere) {
                let shapeData: IRawShapeData = {
                    type: RawShapeType.Sphere,
                    i: shape.pi,
                    j: shape.pj,
                    k: shape.pk,
                    rX: shape.rX,
                    rZ: shape.rZ,
                    rY: shape.rY
                }
                data.shapes.push(shapeData);
            }
            else if (shape instanceof RawShapeLine) {
                let shapeData: IRawShapeData = {
                    type: RawShapeType.Line,
                    Ai: shape.Ai,
                    Aj: shape.Aj,
                    Ak: shape.Ak,
                    Bi: shape.Bi,
                    Bj: shape.Bj,
                    Bk: shape.Bk,
                    i: shape.pi,
                    j: shape.pj,
                    k: shape.pk
                }
                data.shapes.push(shapeData);
            }
            else if (shape instanceof RawShapeDot) {
                let shapeData: IRawShapeData = {
                    type: RawShapeType.Dot,
                    i: shape.pi,
                    j: shape.pj,
                    k: shape.pk,
                    dots: shape.dots
                }
                data.shapes.push(shapeData);
            }
        }

        return data;
    }

    public deserialize(data: IRawCoumpoundPropData): void {
        this.blocks = [];
        this.shapes = [];
        let l = Math.min(data.blocks.length, data.shapes.length);
        for (let i = 0; i < l; i++) {
            this.blocks.push(data.blocks[i]);
            let shapeData = data.shapes[i];
            if (shapeData.type === RawShapeType.Box) {
                let shape = new RawShapeBox(shapeData.w, shapeData.h, shapeData.d, shapeData.i, shapeData.j, shapeData.k);
                this.shapes.push(shape);
            }
            else if (shapeData.type === RawShapeType.Sphere) {
                if (IsVeryFinite(shapeData.r)) {
                    shapeData.rX = shapeData.r;
                    shapeData.rY = shapeData.r;
                    shapeData.rZ = shapeData.r;
                }
                let shape = new RawShapeSphere(shapeData.rX as number, shapeData.rY as number, shapeData.rZ as number, shapeData.i, shapeData.j, shapeData.k);
                this.shapes.push(shape);
            }
            else if (shapeData.type === RawShapeType.Line) {
                let shape = new RawShapeLine(shapeData.Ai as number, shapeData.Aj as number, shapeData.Ak as number, shapeData.Bi as number, shapeData.Bj as number, shapeData.Bk as number, shapeData.i, shapeData.j, shapeData.k);
                this.shapes.push(shape);
            }
            else if (shapeData.type === RawShapeType.Dot) {
                let shape = new RawShapeDot(shapeData.i, shapeData.j, shapeData.k);
                shape.dots = shapeData.dots as IJK[];
                shape.refreshMinMax();
                this.shapes.push(shape);
            }
        }
    }
}
