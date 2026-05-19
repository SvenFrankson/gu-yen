import { Color3, Matrix, Vector3 } from "@babylonjs/core";
import { Chunck } from "./Chunck";
import { DrawDebugHit, DrawDebugPoint, IBox, IIntersection, SphereBoxIntersection } from "babylonjs-tiaratumgames-tools";
import { BlockType } from "./BlockType";

export function SphereChunckIntersection(
    cSphere: Vector3,
    r: number,
    chunck: Chunck
): IIntersection | undefined {
    let localC = cSphere.subtract(chunck.position);
    let rCheck = Math.max(r + 2 * chunck.blockSizeIJ_m, r + 2 * chunck.blockSizeK_m);
    let rCheck2 = rCheck * rCheck;

    let minI = Math.max(0,Math.floor((localC.x - rCheck) / chunck.blockSizeIJ_m));
    let maxI = Math.min(chunck.chunckLengthIJ - 1, Math.ceil((localC.x + rCheck) / chunck.blockSizeIJ_m));
    let minJ = Math.max(0, Math.floor((localC.z - rCheck) / chunck.blockSizeIJ_m));
    let maxJ = Math.min(chunck.chunckLengthIJ - 1, Math.ceil((localC.z + rCheck) / chunck.blockSizeIJ_m));
    let minK = Math.max(0, Math.floor((localC.y - rCheck) / chunck.blockSizeK_m));
    let maxK = Math.min(chunck.chunckLengthK, Math.ceil((localC.y + rCheck) / chunck.blockSizeK_m));

    let bestBlockIntersection: IIntersection | undefined = undefined;
    for (let i = minI; i <= maxI; i++) {
        for (let j = minJ; j <= maxJ; j++) {
            for (let k = minK; k <= maxK; k++) {
                let cBlock = new Vector3(
                    (i + 0.5) * chunck.blockSizeIJ_m,
                    (k + 0.5) * chunck.blockSizeK_m,
                    (j + 0.5) * chunck.blockSizeIJ_m
                );
                let d = cBlock.subtract(localC);
                let d2 = d.lengthSquared();
                if (d2 <= rCheck2 * rCheck2) {
                    let v = chunck.getData(i, j, k);
                    if (v > BlockType.None) {
                        let blockBox: IBox = {
                            worldMatrix: Matrix.Translation(cBlock.x, cBlock.y, cBlock.z),
                            width: chunck.blockSizeIJ_m,
                            height: chunck.blockSizeK_m,
                            depth: chunck.blockSizeIJ_m
                        };
                        let blockIntersection = SphereBoxIntersection(localC, r, blockBox);
                        if (blockIntersection && blockIntersection.hit) {
                            if (!bestBlockIntersection || blockIntersection.depth > bestBlockIntersection.depth) {
                                bestBlockIntersection = blockIntersection;
                            }
                        }
                    }
                }
            }
        }
    }

    if (bestBlockIntersection) {
        bestBlockIntersection.point?.addInPlace(chunck.position);
    }
    return bestBlockIntersection;
}


export function SphereChuncksIntersection(
    cSphere: Vector3,
    r: number,
    chuncks: Chunck[]
): IIntersection[] {
    let intersections: IIntersection[] = [];

    for (let chunck of chuncks) {
        let intersection = SphereChunckIntersection(cSphere, r, chunck);
        if (intersection) {
            intersections.push(intersection);
        }
    }

    return intersections;
}