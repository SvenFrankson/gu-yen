export function EaseOutSine(x: number): number {
  return Math.sin((x * Math.PI) / 2);
}

export function EaseOutCirc(x: number): number {
return Math.sqrt(1 - Math.pow(x - 1, 2));
}