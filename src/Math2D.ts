import { Vector2 } from "@babylonjs/core";

export interface Intersection2DResult {
    x: number;
    y: number;
    nX: number;
    nY: number;
    penetration: number;
}

var TmpVec3 = [Vector2.Zero(), Vector2.Zero(), Vector2.Zero(), Vector2.Zero(), Vector2.Zero()];

export function DistancePointSegment(point: Vector2, segA: Vector2, segB: Vector2): number {
    let AP = TmpVec3[0];
    let dir = TmpVec3[1];
    let projP = TmpVec3[2];
    AP.copyFrom(point).subtractInPlace(segA);
    dir.copyFrom(segB).subtractInPlace(segA);
    let l = dir.length();
    dir.scaleInPlace(1 / l);
    let dist = Vector2.Dot(AP, dir);
    dist = Math.max(Math.min(dist, l), 0);
    projP.copyFrom(dir).scaleInPlace(dist).addInPlace(segA);
    let PprojP = projP.subtractInPlace(point);
    return PprojP.length();
}

export function CircleSquareIntersection(circleX: number, circleY: number, radius: number, squareX: number, squareY: number, squareSize: number): Intersection2DResult | null {
    let dx = circleX - squareX;
    let dy = circleY - squareY;
    if (Math.abs(dx) < radius + squareSize / 2 || Math.abs(dy) < radius + squareSize / 2) {
        let projX = Math.min(squareX + squareSize / 2, Math.max(squareX - squareSize / 2, circleX));
        let projY = Math.min(squareY + squareSize / 2, Math.max(squareY - squareSize / 2, circleY));
        let d = Math.sqrt((circleX - projX) ** 2 + (circleY - projY) ** 2);
        if (d <= radius) {
            let penetration = radius - d;
            let nX: number;
            let nY: number;
            if (d <= 0) {
                nX = circleX - squareX;
                nY = circleY - squareY;
                let len = Math.sqrt(nX * nX + nY * nY);
                if (len > 0) {
                    nX /= len;
                    nY /= len;
                }
            }
            else {
                nX = circleX - projX;
                nY = circleY - projY;
                let len = Math.sqrt(nX * nX + nY * nY);
                if (len > 0) {
                    nX /= len;
                    nY /= len;
                }
            }
            return { x: circleX, y: circleY, nX, nY, penetration };
        }
    }
    return null;
}

export function CapsuleRectCheck(segA: Vector2, segB: Vector2, radius: number,  squareMin: Vector2, squareMax: Vector2): boolean {
    let capsMinX = Math.min(segA.x, segB.x) - radius;
    let capsMaxX = Math.max(segA.x, segB.x) + radius;
    let capsMinY = Math.min(segA.y, segB.y) - radius;
    let capsMaxY = Math.max(segA.y, segB.y) + radius;

    if (capsMaxX < squareMin.x || capsMinX > squareMax.x || capsMaxY < squareMin.y || capsMinY > squareMax.y) {
        return false;
    }
    return true;
}