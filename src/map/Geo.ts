import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class GeoConverter {

    public radius: number = 6378137;
    public latZero: number = 44.8206818;
    public longZero: number = -0.5877973;

    public halfAngularHeight = Math.atan2(2 * 16384, this.radius) / Math.PI * 180;
    public halfAngularWidth = Math.atan2(2 * 16384, this.radius * Math.cos(this.latZero * Math.PI / 180)) / Math.PI * 180;

    public angularHeight = 2 * this.halfAngularHeight;
    public angularWidth = 2 * this.halfAngularWidth;

    public latMin = this.latZero - this.halfAngularHeight;
    public latMax = this.latZero + this.halfAngularHeight
    public longMin = this.longZero - this.halfAngularWidth;
    public longMax = this.longZero + this.halfAngularWidth;

    public latLongToVector3(lat: number, long: number): Vector3 {
        let x = (long - this.longZero) / this.halfAngularWidth * 2 * 16384;
        let z = (lat - this.latZero) / this.halfAngularHeight * 2 * 16384;
        return new Vector3(x, 0, z);
    }

    public vector3ToLatLong(position: Vector3): { lat: number, long: number } {
        let long = position.x / (2 * 16384) * this.halfAngularWidth + this.longZero;
        let lat = position.z / (2 * 16384) * this.halfAngularHeight + this.latZero;
        return { lat, long };
    }
}