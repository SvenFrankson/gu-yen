import { ITerrainProperties } from "../Terrain";
import { Chunck } from "../Chunck";

export enum MapAttribute {
    None,
    Tunnels,
    Rocks
}

export interface IChunckData {
    name: string,
    data: string
}

export interface ITerrainData {
    prop: ITerrainProperties;
    chuncks: IChunckData[]
}

export interface IGameData {
    terrain: ITerrainData
}

export class GameSave {

    public data: IGameData;

    constructor(prop: ITerrainProperties) {
        this.data = {
            terrain: {
                prop: prop,
                chuncks: []
            }
        }
    }

    public deserialize(dataString: string): void {
        this.data = JSON.parse(dataString);
    }

    public serialize(): string {
        return JSON.stringify(this.data);
    }

    public saveChunck(chunck: Chunck): void {
        let existingChunck = this.data.terrain.chuncks.find(c => { return c.name === chunck.name; });
        if (!existingChunck) {
            existingChunck = {
                name: chunck.name,
                data: ""
            };
            this.data.terrain.chuncks.push(existingChunck);
        }
        existingChunck.data = chunck.serializeData2();
    }
}
