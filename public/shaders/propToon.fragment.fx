#version 300 es
precision highp float;
precision mediump sampler3D;
 
uniform vec3 lightInvDirW;
uniform vec3 debugColor;
uniform vec3 cameraPosition;
uniform float rangeRadius_m;
uniform vec3 rangePosition;

in vec3 vPositionL;
in vec3 vPositionW;
in vec3 vNormalL;
in vec3 vNormalW;
in vec2 vUv;
in vec4 vColor;

out vec4 outColor;
 
void main() {
   int colorIndex = 0;
   vec3 color = vColor.rgb;

   float sunLightFactor = (dot(vNormalW, lightInvDirW) + 1.) * 0.5;
   float lightFactor = sunLightFactor;

   float outlineThreshold = 0.;
   lightFactor = round(lightFactor * 2.) / 2. * 0.7 + 0.3;

   float depthX = vPositionW.x - cameraPosition.x;
   float depthZ = vPositionW.z - cameraPosition.z;
   float depth = sqrt(depthX * depthX + depthZ * depthZ) / 150.;
   depth = max(min(depth, 1.), 0.);
   depth = depth * depth;
   color *= debugColor * lightFactor;
   //color *= (1. - depth);
   //color += vec3(141. / 255., 107. / 255., 56. / 255.) * depth;
   //color += vec3(60. / 255., 60. / 255., 60. / 255.) * depth;
   outColor = vec4(color, 1);
}