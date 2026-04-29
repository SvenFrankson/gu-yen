import { IsVeryFinite } from "./Number";

export function Compress(data: Uint8Array): Uint8Array {
    let out: number[] = [];

    let lastD: number | undefined = undefined;
    let count: number = 0;
    for (let i = 0; i < data.length; i++) {
        let d = data[i];
        if (d === lastD) {
            count++;
            if (count > 255) {
                out.push(255, lastD);
                count = 1;
            }
        } else {
            if (IsVeryFinite(lastD)) {
                out.push(count, lastD as number);
            }
            lastD = d;
            count = 1;
        }
    }
    if (IsVeryFinite(lastD)) {
        out.push(count, lastD as number);
    }

    return new Uint8Array(out);
}

export function Decompress(data: Uint8Array): Uint8Array {
    let out: number[] = [];

    for (let i = 0; i < data.length / 2; i++) {
        let count = data[2 * i];
        let d = data[2 * i + 1];
        for (let n = 0; n < count; n++) {
            out.push(d);
        }
    }

    return new Uint8Array(out);
}
