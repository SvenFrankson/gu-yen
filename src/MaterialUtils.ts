import { StandardMaterial, Color3, Scene } from "@babylonjs/core";

export function MakeStandardMaterial(scene: Scene, color: Color3, specular: number = 0.1, emissive: number = 0): StandardMaterial {
    let material = new StandardMaterial("material", scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(specular, specular, specular);
    material.emissiveColor = new Color3(emissive, emissive, emissive);
    return material;
}