import { Chunck } from "./Chunck";
import { Terrain } from "./Terrain";

export class TerrainAnalytic {

    private _drawnChuncks: Chunck[] = [];
    private _drawnChuncksUpdateTime: number = - Infinity;
    
    constructor(public terrain: Terrain) {

    }

    public getDrawnChuncks(freshness: number = 100): Chunck[] {
        let t = performance.now();
        let dt = t - this._drawnChuncksUpdateTime;
        if (dt > freshness) {
            this._drawnChuncks = [];
            for (let i = 0; i <= this.terrain.maxDisplayedLevel; i++) {
                this._drawnChuncks.push(...this.terrain.root?.getDescendants(i) ?? []);
            }
            this._drawnChuncksUpdateTime = t;
        }
        return this._drawnChuncks;
    }

    public getChunckBuildTimeQuantile(q: number): number {
        let chuncks = this.getDrawnChuncks();
        if (chuncks.length > 0) {
            chuncks = chuncks.sort((c1, c2) => { return c1.analytic.duration - c2.analytic.duration});
            let n = Math.floor(q * chuncks.length);
            n = Math.min(n, chuncks.length - 1);
            return chuncks[n].analytic.duration;
        }
        return 0;
    }

    public getChunckBuildCountAverage(): number {
        let chuncks = this.getDrawnChuncks();
        if (chuncks.length > 0) {
            let v = 0;
            for (let i = 0; i < chuncks.length; i++) {
                v += chuncks[i].analytic.buildCount;
            }
            v = v / chuncks.length;
            return v;
        }
        return 0;
    }
}
