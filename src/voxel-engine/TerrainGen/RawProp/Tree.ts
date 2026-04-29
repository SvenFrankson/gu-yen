import { RawProp } from "./RawProp";
import { RawShapeBox, RawShapeSphere } from "../RawShape/RawShape";
import { BlockType } from "../../BlockType";
import { Chunck } from "../../Chunck";

export class Oak extends RawProp {

    private _trunk: RawShapeBox;
    private _leaves: RawShapeSphere;

    constructor(public height: number = 10) {
        super();
        this._trunk = new RawShapeBox(3, this.height, 3, - 1, - 1, 0);
        this._leaves = new RawShapeSphere(this.height * 0.5 + 0.5, 0, 0, this.height * 1.5);
    }

    public draw(i: number, j: number, k: number, chunck: Chunck): void {
        this._trunk.draw(BlockType.Dirt, i, j, k, chunck);
        this._leaves.draw(BlockType.Leaf, i, j, k, chunck);
    }
}

export class Cactus extends RawProp {

    private _trunk: RawShapeBox;
    private _arms: RawShapeBox[];

    constructor(public height: number = 8) {
        super();
        this._trunk = new RawShapeBox(1, this.height, 1);
        let y0 = Math.floor(this.height / 3);
        let y1 = Math.floor(2 * this.height / 3);
        this._arms = [
            new RawShapeBox(3, 1, 1, 0, 0, y0),
            new RawShapeBox(1, 3, 1, 3, 0, y0),
            new RawShapeBox(3, 1, 1, -3, 0, y1),
            new RawShapeBox(1, 3, 1, - 3, 0, y1)
        ]
    }

    public draw(i: number, j: number, k: number, chunck: Chunck): void {
        this._trunk.draw(BlockType.Leaf, i, j, k, chunck);
        this._arms.forEach(arm => {
            arm.draw(BlockType.Leaf, i, j, k, chunck);
        });
    }
}
