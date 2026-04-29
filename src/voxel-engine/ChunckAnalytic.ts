import { Chunck } from "./Chunck";

export interface IChunckAnalyticBuildOccurence {
    duration?: number;
    buildRefDuration?: number;
    fillVertexDuration?: number;
    postProcessDuration?: number;
    triangleCount?: number;
    firstNonEmptyReferenceK?: number;
    lastNonEmptyReferenceK?: number;
}

export class ChunckAnalytic {

    private _buildOccurences: IChunckAnalyticBuildOccurence[] = [];

    constructor(public chunck: Chunck) {

    }

    public get duration(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].duration;
        }
        return 0;
    }

    public get buildDuration(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].buildRefDuration;
        }
        return 0;
    }

    public get fillDuration(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].fillVertexDuration;
        }
        return 0;
    }

    public get postProcessDuration(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].postProcessDuration;
        }
        return 0;
    }

    public get triangleCount(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].triangleCount;
        }
        return 0;
    }

    public get buildDurationPerTriangle(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].duration / (this._buildOccurences[this._buildOccurences.length - 1].triangleCount / 1000);
        }
        return 0;
    }

    public get firstNonEmptyReferenceK(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].firstNonEmptyReferenceK;
        }
        return 0;
    }

    public get lastNonEmptyReferenceK(): number {
        if (this._buildOccurences.length > 0) {
            return this._buildOccurences[this._buildOccurences.length - 1].lastNonEmptyReferenceK;
        }
        return 0;
    }

    public get buildCount(): number {
        return this._buildOccurences.length;
    }

    public addBuildOccurence(occurence: IChunckAnalyticBuildOccurence): void {
        this._buildOccurences.push(occurence);
    }
}
