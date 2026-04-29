import { RawCoumpoundProp } from "../TerrainGen/RawProp/RawProp";

export class Trees {
    public props: RawCoumpoundProp[] = [];

    public initialize(): void {
        this.props = [];

        let tree1 = new RawCoumpoundProp();
        tree1.deserialize({
            blocks: [6, 6, 6, 6, 7, 7, 7, 7, 7, 6, 6],
            shapes: [
                { type: 0, i: 0, j: -2, k: 0, w: 3, d: 3, h: 11 },
                { type: 3, Ai: 11, Aj: 1, Ak: 7, Bi: 11, Bj: -2, Bk: 6, i: -10, j: 3, k: -1 },
                { type: 3, Ai: 7, Aj: -1, Ak: 7, Bi: 8, Bj: -1, Bk: 9, i: 0, j: 0, k: 0 },
                { type: 3, Ai: -1, Aj: -1, Ak: 7, Bi: -4, Bj: -1, Bk: 8, i: 0, j: 0, k: -1 },
                { type: 1, i: 1, j: -1, k: 14, rX: 5, rZ: 5, rY: 3 },
                { type: 0, i: -5, j: -3, k: 8, w: 3, d: 5, h: 2 },
                { type: 0, i: -1, j: 3, k: 7, w: 5, d: 3, h: 3 },
                { type: 0, i: 7, j: -3, k: 10, w: 4, d: 5, h: 2 },
                { type: 0, i: -1, j: -8, k: 8, w: 5, d: 3, h: 3 },
                { type: 3, Ai: 3, Aj: -1, Ak: 7, Bi: 6, Bj: -1, Bk: 7, i: 0, j: 0, k: 0 },
                { type: 3, Ai: 1, Aj: -3, Ak: 7, Bi: 1, Bj: -5, Bk: 7, i: 0, j: 0, k: 0 },
            ],
        });
        this.props.push(tree1);

        let tree2 = new RawCoumpoundProp();
        tree2.deserialize({
            blocks: [6, 7, 7, 6, 6, 6, 6, 6, 7, 7],
            shapes: [
                { type: 0, i: 0, j: -2, k: 0, w: 3, d: 3, h: 8 },
                { type: 1, i: 3, j: 3, k: 10, rX: 3, rZ: 3, rY: 2 },
                { type: 1, i: -2, j: -4, k: 13, rX: 4, rZ: 4, rY: 2 },
                { type: 0, i: -2, j: -4, k: 9, w: 2, d: 2, h: 2 },
                { type: 0, i: 1, j: -1, k: 7, w: 3, d: 3, h: 2 },
                { type: 0, i: -1, j: -4, k: 7, w: 2, d: 3, h: 2 },
                { type: 0, i: 0, j: -3, k: 6, w: 2, d: 1, h: 2 },
                { type: 3, Ai: 0, Aj: 0, Ak: 7, Bi: -3, Bj: 0, Bk: 8, i: -1, j: 1, k: 0 },
                { type: 0, i: -5, j: 0, k: 9, w: 3, d: 3, h: 1 },
                { type: 0, i: 2, j: -5, k: 7, w: 3, d: 3, h: 3 },
            ],
        });
        this.props.push(tree2);
    }

    public getTree(n: number): RawCoumpoundProp {
        return this.props[n % this.props.length];
    }
}
