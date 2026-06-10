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

export function compressUInt8Array(data: Uint8Array): Uint8Array {
    let compressed: number[] = [];
    let count = 0;
    let lastValue = -1;
    for (let i = 0; i < data.length; i++) {
        let v = data[i];
        if (v === lastValue && count < 255) {
            count++;
        }
        else {
            if (count > 0) {
                compressed.push(count);
                compressed.push(lastValue);
            }
            count = 1;
            lastValue = v;
        }
    }
    if (count > 0) {
        compressed.push(count);
        compressed.push(lastValue);
    }
    return new Uint8Array(compressed);
}

export function decompressUInt8Array(compressed: Uint8Array): Uint8Array {
    let data: number[] = [];
    for (let i = 0; i < compressed.length; i += 2) {
        let count = compressed[i];
        let value = compressed[i + 1];
        for (let j = 0; j < count; j++) {
            data.push(value);
        }
    }
    return new Uint8Array(data);
}