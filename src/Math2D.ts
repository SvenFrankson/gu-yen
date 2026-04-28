export interface Intersection2DResult {
    x: number;
    y: number;
    nX: number;
    nY: number;
    penetration: number;
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