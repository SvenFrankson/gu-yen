import { Terrain } from "../../Terrain";
import { Chunck } from "../../Chunck";
import { BlockType } from "../../BlockType";
import { TerrainEditionMode } from "../../TerrainEditor/TerrainEditor";
import { Line } from "./Line";

export class Triangle {
    constructor(public terrain: Terrain) {
        
    }

    public draw(chunck: Chunck, ijk0: IJK, ijk1: IJK, ijk2: IJK, blockType: BlockType, mode: TerrainEditionMode, saveToLocalStorage?: boolean, skipChunckRedraw?: boolean) {
        let affectedChuncks = new UniqueList<Chunck>();

        let line01 = Nabu.GetLineIJKsFromTo(ijk0, ijk1);
        let line02 = Nabu.GetLineIJKsFromTo(ijk0, ijk2);
        let line03 = Nabu.GetLineIJKsFromTo(ijk1, ijk2);

        let n = Math.max(line01.length, line02.length);

        let lineShape = new Line(this.terrain);
        /*
        for (let i = 0; i < n; i++) {
            let iA = Math.round(i / n * line01.length);
            iA = Nabu.MinMax(iA, 0, line01.length - 1);
            let ijkA = line01[iA];
            
            let iB = Math.round(i / n * line02.length);
            iB = Nabu.MinMax(iB, 0, line02.length - 1);
            let ijkB = line02[iB];

            let chuncks = lineShape.draw(chunck, ijkA, ijkB, blockType, mode, false, true);
            chuncks.forEach((c) => {
                affectedChuncks.push(c);
            });
        }
        */

        for (let iA = 0; iA < line01.length; iA++) {
            for (let iB = 0; iB < line02.length; iB++) {
                let ijkA = line01[iA];
                let ijkB = line02[iB];

                let chuncks = lineShape.draw(chunck, ijkA, ijkB, blockType, mode, false, true);
                chuncks.forEach((c) => {
                    affectedChuncks.push(c);
                });
            }
        }
        
        for (let iA = 0; iA < line01.length; iA++) {
            for (let iB = 0; iB < line03.length; iB++) {
                let ijkA = line01[iA];
                let ijkB = line03[iB];

                let chuncks = lineShape.draw(chunck, ijkA, ijkB, blockType, mode, false, true);
                chuncks.forEach((c) => {
                    affectedChuncks.push(c);
                });
            }
        }
        
        for (let iA = 0; iA < line02.length; iA++) {
            for (let iB = 0; iB < line03.length; iB++) {
                let ijkA = line02[iA];
                let ijkB = line03[iB];

                let chuncks = lineShape.draw(chunck, ijkA, ijkB, blockType, mode, false, true);
                chuncks.forEach((c) => {
                    affectedChuncks.push(c);
                });
            }
        }

        if (!skipChunckRedraw) {
            for (let i = 0; i < affectedChuncks.length; i++) {
                let chunck = affectedChuncks.get(i);
                for (let k = Math.min(ijk0.k, ijk1.k); k <= Math.max(ijk0.k, ijk1.k); k++) {
                    chunck.updateIsEmptyIsFull(ijk0.k + k);
                }
                chunck.redrawMesh(true);
                if (saveToLocalStorage) {
                    chunck.saveToLocalStorage();
                }
                this.terrain.save.saveChunck(chunck);
            }
        }

        return affectedChuncks;
    }
}
