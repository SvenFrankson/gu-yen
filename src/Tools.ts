export async function NextFrame(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => resolve());
    });
}

export async function WaitNSeconds(n: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => resolve(), n * 1000);
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

export function download(filename: string, text: string) {
    var e = document.createElement('a');
    e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    e.setAttribute('download', filename);
    
    e.style.display = 'none';
    document.body.appendChild(e);
    e.click();
    document.body.removeChild(e);
}