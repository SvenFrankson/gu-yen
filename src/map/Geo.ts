import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class GeoConverter {

    public radius: number = 6378137;
    public latZero: number = 44.8206818;
    public longZero: number = -0.5877973;

    public latLongToVector3(latitude: number, longitude: number): Vector3 {
        let relativeLat = latitude - this.latZero;
        let relativeLong = longitude - this.longZero;
        let x = Math.tan(relativeLong * Math.PI / 180) * this.radius * Math.cos(this.latZero * Math.PI / 180);
        let z = Math.tan(relativeLat * Math.PI / 180) * this.radius;
        return new Vector3(x, 0, z);
    }
}