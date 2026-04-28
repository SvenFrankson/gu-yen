import { StandardMaterial, Color3 } from "@babylonjs/core";

export function MakeStandardMaterial(color: Color3, specular: number = 0.1, emissive: number = 0.4): StandardMaterial {
    let material = new StandardMaterial("material");
    material.diffuseColor = color;
    material.specularColor = new Color3(specular, specular, specular);
    material.emissiveColor = new Color3(emissive, emissive, emissive);
    return material;
}