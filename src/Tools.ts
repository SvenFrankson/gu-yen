export async function NextFrame(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => resolve());
    });
}

export function smoothNSec(fps: number, n: number): number {
    if (!isFinite(fps)) {
        return 0;
    }
    if (n === 0) {
        return 0;
    }
    if (fps < 1) {
        return 0;
    }
    return 1 - 1 / (n * 0.45 * fps);
}