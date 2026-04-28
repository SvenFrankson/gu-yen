import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

export interface ISceneObject {
    getScene: () => Scene;
}

export class AnimationFactory {
    
    public static EmptyVoidCallback: (duration: number) => Promise<void> = async (duration: number) => {};
    public static EmptyNumberCallback: (target: number, duration: number, overrideEasing?: (v: number) => number) => Promise<void> = async (target: number, duration: number, overrideEasing?: (v: number) => number) => {};
    public static EmptyNumbersCallback: (targets: number[], duration: number) => Promise<void> = async (targets: number[], duration: number) => {};
    public static EmptyVector3Callback: (target: Vector3, duration: number, overrideEasing?: (v: number) => number) => Promise<void> = async (target: Vector3, duration: number, overrideEasing?: (v: number) => number) => {};
    public static EmptyColor3Callback: (target: Color3, duration: number, overrideEasing?: (v: number) => number) => Promise<void> = async (target: Color3, duration: number, overrideEasing?: (v: number) => number) => {};
    public static EmptyQuaternionCallback: (target: Quaternion, duration: number, overrideEasing?: (v: number) => number) => Promise<void> = async (target: Quaternion, duration: number, overrideEasing?: (v: number) => number) => {};

    public static CreateWait(
        owner: ISceneObject,
        onUpdateCallback?: () => void
    ): (duration: number) => Promise<void> {
        return (duration: number) => {
            return new Promise<void>(resolve => {
                let t0 = performance.now();
                let animationCB = () => {
                    let t = (performance.now() - t0) / 1000;
                    let f = t / duration;
                    if (f < 1) {
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                    }
                    else {
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                        owner.getScene().onBeforeRenderObservable.removeCallback(animationCB);
                        resolve();
                    }
                }
                owner.getScene().onBeforeRenderObservable.add(animationCB);
            })
        }
    }

    public static CreateNumber(
        owner: ISceneObject,
        obj: any,
        property: string,
        onUpdateCallback?: () => void,
        easing?: (v: number) => number
    ): (target: number, duration: number, overrideEasing?: (v: number) => number) => Promise<void> {
        return (target: number, duration: number, overrideEasing?: (v: number) => number) => {
            return new Promise<void>(resolve => {
                let origin: number = obj[property];
                let t0 = performance.now();
                if ((owner as any)[property + "_animation"]) {
                    owner.getScene().onBeforeRenderObservable.removeCallback((owner as any)[property + "_animation"]);
                }
                let animationCB = () => {
                    let f = (performance.now() - t0) / 1000 / duration;
                    if (f < 1) {
                        if (overrideEasing) {
                            f = overrideEasing(f);
                        }
                        else if (easing) {
                            f = easing(f);
                        }
                        obj[property] = origin * (1 - f) + target * f;
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                    }
                    else {
                        obj[property] = target;
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                        owner.getScene().onBeforeRenderObservable.removeCallback(animationCB);
                        (owner as any)[property + "_animation"] = undefined;
                        resolve();
                    }
                }
                owner.getScene().onBeforeRenderObservable.add(animationCB);
                (owner as any)[property + "_animation"] = animationCB;
            })
        }
    }

    /*
    public static CreateNumbers(
        owner: ISceneObject,
        obj: any,
        properties: string[],
        onUpdateCallback?: () => void,
        isAngle?: boolean[],
        easing?: (v: number) => number
    ): (targets: number[], duration: number) => Promise<void> {
        return (targets: number[], duration: number) => {
            return new Promise<void>(resolve => {
                let n = properties.length;
                let origins: number[] = [];
                for (let i = 0; i < n; i++) {
                    origins[i] = obj[properties[i]];
                }
                let t0 = performance.now();
                if ((owner as any)[properties[0] + "_animation"]) {
                    owner.getScene().onBeforeRenderObservable.removeCallback((owner as any)[properties[0] + "_animation"]);
                }
                let animationCB = () => {
                    let f = (performance.now() - t0) / 1000 / duration;
                    if (f < 1) {
                        if (easing) {
                            f = easing(f);
                        }
                        for (let i = 0; i < n; i++) {
                            if (isAngle && isAngle[i]) {
                                obj[properties[i]] = Nabu.LerpAngle(origins[i], targets[i], f);
                            }
                            else {
                                obj[properties[i]] = origins[i] * (1 - f) + targets[i] * f;
                            }
                        }
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                    }
                    else {
                        for (let i = 0; i < n; i++) {
                            obj[properties[i]] = targets[i];
                        }
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                        owner.getScene().onBeforeRenderObservable.removeCallback(animationCB);
                        (owner as any)[properties[0] + "_animation"] = undefined;
                        resolve();
                    }
                }
                owner.getScene().onBeforeRenderObservable.add(animationCB);
                (owner as any)[properties[0] + "_animation"] = animationCB;
            })
        }
    }
    */

    public static CreateVector3(
        owner: ISceneObject,
        obj: any,
        property: string,
        onUpdateCallback?: () => void,
        easing?: (v: number) => number
    ): (target: Vector3, duration: number, overrideEasing?: (v: number) => number) => Promise<void> {
        return (target: Vector3, duration: number, overrideEasing?: (v: number) => number) => {
            return new Promise<void>(resolve => {
                let origin: Vector3 = obj[property].clone();
                let tmpVector3 = Vector3.Zero();
                let t0 = performance.now();
                if ((owner as any)[property + "_animation"]) {
                    owner.getScene().onBeforeRenderObservable.removeCallback((owner as any)[property + "_animation"]);
                }
                let animationCB = () => {
                    let f = (performance.now() - t0) / 1000 / duration;
                    if (f < 1) {
                        if (overrideEasing) {
                            f = overrideEasing(f);
                        }
                        else if (easing) {
                            f = easing(f);
                        }
                        tmpVector3.copyFrom(target).scaleInPlace(f);
                        obj[property].copyFrom(origin).scaleInPlace(1 - f).addInPlace(tmpVector3);
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                    }
                    else {
                        obj[property].copyFrom(target);
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                        owner.getScene().onBeforeRenderObservable.removeCallback(animationCB);
                        (owner as any)[property + "_animation"] = undefined;
                        resolve();
                    }
                }
                owner.getScene().onBeforeRenderObservable.add(animationCB);
                (owner as any)[property + "_animation"] = animationCB;
            })
        }
    }

    public static CreateColor3(
        owner: ISceneObject,
        obj: any,
        property: string,
        onUpdateCallback?: () => void,
        easing?: (v: number) => number
    ): (target: Color3, duration: number, overrideEasing?: (v: number) => number) => Promise<void> {
        return (target: Color3, duration: number, overrideEasing?: (v: number) => number) => {
            return new Promise<void>(resolve => {
                let origin: Color3 = obj[property].clone();
                let tmpColor3 = Color3.Black();
                let t0 = performance.now();
                if ((owner as any)[property + "_animation"]) {
                    owner.getScene().onBeforeRenderObservable.removeCallback((owner as any)[property + "_animation"]);
                }
                let animationCB = () => {
                    let f = (performance.now() - t0) / 1000 / duration;
                    if (f < 1) {
                        if (overrideEasing) {
                            f = overrideEasing(f);
                        }
                        else if (easing) {
                            f = easing(f);
                        }
                        tmpColor3.copyFrom(target).scaleInPlace(f);
                        obj[property].copyFrom(origin).scaleInPlace(1 - f).addInPlace(tmpColor3);
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                    }
                    else {
                        obj[property].copyFrom(target);
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                        owner.getScene().onBeforeRenderObservable.removeCallback(animationCB);
                        (owner as any)[property + "_animation"] = undefined;
                        resolve();
                    }
                }
                owner.getScene().onBeforeRenderObservable.add(animationCB);
                (owner as any)[property + "_animation"] = animationCB;
            })
        }
    }

    public static CreateQuaternion(
        owner: ISceneObject,
        obj: any,
        property: string,
        onUpdateCallback?: () => void,
        easing?: (v: number) => number
    ): (target: Quaternion, duration: number, overrideEasing?: (v: number) => number) => Promise<void> {
        return (target: Quaternion, duration: number, overrideEasing?: (v: number) => number) => {
            return new Promise<void>(resolve => {
                let origin: Quaternion = obj[property].clone();
                let t0 = performance.now();
                if ((owner as any)[property + "_animation"]) {
                    owner.getScene().onBeforeRenderObservable.removeCallback((owner as any)[property + "_animation"]);
                }
                let animationCB = () => {
                    let f = (performance.now() - t0) / 1000 / duration;
                    if (f < 1) {
                        if (overrideEasing) {
                            f = overrideEasing(f);
                        }
                        else if (easing) {
                            f = easing(f);
                        }
                        Quaternion.SlerpToRef(origin, target, f, obj[property]);
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                    }
                    else {
                        obj[property].copyFrom(target);
                        if (onUpdateCallback) {
                            onUpdateCallback();
                        }
                        owner.getScene().onBeforeRenderObservable.removeCallback(animationCB);
                        (owner as any)[property + "_animation"] = undefined;
                        resolve();
                    }
                }
                owner.getScene().onBeforeRenderObservable.add(animationCB);
                (owner as any)[property + "_animation"] = animationCB;
            })
        }
    }
}