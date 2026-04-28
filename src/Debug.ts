import { Engine } from "@babylonjs/core/Engines/engine";
import type { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

export function DrawDebugLine(from: Vector3, to: Vector3, frames: number = Infinity, color?: Color3, scene?: Scene): Mesh | undefined {
    if (!scene) {
        scene = Engine.Instances[0]?.scenes[0];
    }

    if (scene) {
        let colors: Color4[] | undefined = undefined;
        if (color) {
            colors = [
                color.toColor4(),
                color.toColor4()
            ]
        }
        
        let line = MeshBuilder.CreateLines(
            "debug-line",
            {
                points: [from, to],
                colors: colors
            }
        );
        
        if (isFinite(frames)) {
            let frameCount = frames;
            let disposeTimer = () => {
                frameCount--;
                if (frameCount <= 0) {
                    line.dispose();
                }
                else {
                    requestAnimationFrame(disposeTimer);
                }
            }
            requestAnimationFrame(disposeTimer);
        }

        return line;
    }
}

/*
export function DrawDebugHit(point: Vector3, normal: Vector3, frames: number = Infinity, color?: Color3, scene?: Scene): Mesh | undefined {
    if (!scene) {
        scene = Engine.Instances[0]?.scenes[0];
    }

    if (scene) {
        let colors: Color4[][];
        if (color) {
            colors = [
                [
                    color.toColor4(),
                    color.toColor4(),
                    color.toColor4()
                ],
                [
                    color.toColor4(),
                    color.toColor4()
                ],
                [
                    color.toColor4(),
                    color.toColor4()
                ],
                [
                    color.toColor4(),
                    color.toColor4()
                ]
            ]
        }
        
        let f1 = Vector3.Cross(normal, new Vector3(Math.random(), Math.random(), Math.random())).normalize().scaleInPlace(0.01);
        let f2 = Mummu.Rotate(f1, normal, 2 * Math.PI / 3);
        let f3 = Mummu.Rotate(f2, normal, 2 * Math.PI / 3);
        f1.addInPlace(point);
        f2.addInPlace(point);
        f3.addInPlace(point);
        let p = point.add(normal.scale(0.1));
        let line = MeshBuilder.CreateLineSystem(
            "debug-points",
            {
                lines: [
                    [f1, f2, f3],
                    [f1, p],
                    [f2, p],
                    [f3, p]
                ],
                colors: colors
            },
            scene
        );
        
        if (isFinite(frames)) {
            let frameCount = frames;
            let disposeTimer = () => {
                frameCount--;
                if (frameCount <= 0) {
                    line.dispose();
                }
                else {
                    requestAnimationFrame(disposeTimer);
                }
            }
            requestAnimationFrame(disposeTimer);
        }

        return line;
    }
}
*/

export function DrawDebugPoint(points: Vector3, frames: number = Infinity, color?: Color3, size: number = 0.2, scene?: Scene): Mesh | undefined {
    if (!scene) {
        scene = Engine.Instances[0]?.scenes[0];
    }

    if (scene) {
        let colors: Color4[][] | undefined = undefined;
        if (color) {
            colors = [
                [
                    color.toColor4(),
                    color.toColor4()
                ],
                [
                    color.toColor4(),
                    color.toColor4()
                ],
                [
                    color.toColor4(),
                    color.toColor4()
                ]
            ]
        }
        
        let line = MeshBuilder.CreateLineSystem(
            "debug-points",
            {
                lines: [
                    [
                        points.add(new Vector3(- size * 0.5, 0, 0)),
                        points.add(new Vector3( size * 0.5, 0, 0))
                    ],
                    [
                        points.add(new Vector3(0, - size * 0.5, 0)),
                        points.add(new Vector3(0,  size * 0.5, 0))
                    ],
                    [
                        points.add(new Vector3(0, 0, - size * 0.5)),
                        points.add(new Vector3(0, 0,  size * 0.5))
                    ]
                ],
                colors: colors
            },
            scene
        );
        
        if (isFinite(frames)) {
            let frameCount = frames;
            let disposeTimer = () => {
                frameCount--;
                if (frameCount <= 0) {
                    line.dispose();
                }
                else {
                    requestAnimationFrame(disposeTimer);
                }
            }
            requestAnimationFrame(disposeTimer);
        }

        return line;
    }
}

export function DrawDebugTriangle(p1: Vector3, p2: Vector3, p3: Vector3, frames: number = Infinity, color?: Color3, scene?: Scene): Mesh | undefined {
    if (!scene) {
        scene = Engine.Instances[0]?.scenes[0];
    }

    if (scene) {
        let colors: Color4[] | undefined = undefined;
        if (color) {
            colors = [
                color.toColor4(),
                color.toColor4(),
                color.toColor4(),
                color.toColor4()
            ]
        }
        
        let line = MeshBuilder.CreateLines(
            "debug-triangle",
            {
                points: [p1, p2, p3, p1],
                colors: colors
            }
        );
        
        if (isFinite(frames)) {
            let frameCount = frames;
            let disposeTimer = () => {
                frameCount--;
                if (frameCount <= 0) {
                    line.dispose();
                }
                else {
                    requestAnimationFrame(disposeTimer);
                }
            }
            requestAnimationFrame(disposeTimer);
        }

        return line;
    }
}