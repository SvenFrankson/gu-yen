#version 300 es
precision highp float;
 
uniform vec3 terrainColors[13];
uniform vec3 lightInvDirW;
uniform int level;
uniform float blockSize_m;

in vec3 vPositionW;
in vec3 vNormalW;
in vec2 vUv;
in vec2 vUv2;
in vec4 vColor;

flat in int colorIndex1;
flat in int colorIndex2;
flat in int colorIndex3;

in vec3 color1;
in vec3 color2;
in vec3 color3;

out vec4 outColor;

float f1(float x, float y, float z) {
   float period1 = 2.;
   float period2 = 4.;
   float ampli1 = 0.05;
   float ampli2 = 0.;
   //x += 1.2 * y;
   //x += 1.3 * z;
   return sin(x / 0.333 * 3.1415 * period1) * ampli1 + sin(x / 0.333 * 3.1415 * period2) * ampli2;
}

float f2(float x) {
   return (1. - cos(x / 0.333 * 3.1415 * 6.)) * 0.5 * 0.05;
}

float f(float x, float y, float z) {
   return 0.;
}
 
void main() {
   int colorIndex = 0;
   vec3 color = vec3(0., 0., 0.);
   vec3 baryPos = vColor.rgb;

   float sunLightFactor = (dot(vNormalW, lightInvDirW) + 1.) * 0.5;
   float lightFactor = sunLightFactor / 1.3;

   float period = 1.;
   float ampli = 0.1;

   // case all same
   if (colorIndex1 == colorIndex2 && colorIndex2 == colorIndex3) {
      color = color1;
      colorIndex = colorIndex1;
   }
   // case one pair
   else if (colorIndex1 == colorIndex2) {
      float offset = 0.;
      if (baryPos.r > baryPos.g) {
         offset += f(baryPos.g, vPositionW.x, vPositionW.z);
      }
      else if (baryPos.g > baryPos.r) {
         offset -= f(baryPos.r, vPositionW.x, vPositionW.z);
      }
      
      if (baryPos.b + offset > baryPos.r && baryPos.b + offset > baryPos.g) {
         color = color3;
         colorIndex = colorIndex3;
      }
      else {
         color = color1;
         colorIndex = colorIndex1;
      }
   }
   else if (colorIndex1 == colorIndex3) {
      float offset = 0.;
      if (baryPos.r > baryPos.b) {
         offset += f(baryPos.b, vPositionW.x, vPositionW.z);
      }
      else if (baryPos.b > baryPos.r) {
         offset -= f(baryPos.r, vPositionW.x, vPositionW.z);
      }

      if (baryPos.g + offset > baryPos.r && baryPos.g + offset > baryPos.b) {
         color = color2;
         colorIndex = colorIndex2;
      }
      else {
         color = color1;
         colorIndex = colorIndex1;
      }
   }
   else if (colorIndex2 == colorIndex3) {
      float offset = 0.;
      if (baryPos.g > baryPos.b) {
         offset += f(baryPos.b, vPositionW.x, vPositionW.z);
      }
      else if (baryPos.b > baryPos.g) {
         offset -= f(baryPos.g, vPositionW.x, vPositionW.z);
      }

      if (baryPos.r + offset > baryPos.g && baryPos.r + offset > baryPos.b) {
         color = color1;
         colorIndex = colorIndex1;
      }
      else {
         color = color2;
         colorIndex = colorIndex2;
      }
   }
   // case all different
   else {
      float factor1 = 10.;
      float factor2 = 9.;
      float factor3 = 11.;

      //float offset1 = (cos(vPositionW.x * factor1 + vPositionW.y * factor1 * 0.5) + cos(vPositionW.y * factor1 + vPositionW.z * factor1 * 0.5) + cos(vPositionW.z * factor1 + vPositionW.x * factor1 * 0.5)) * 0.1;
      //float offset2 = (cos(vPositionW.x * factor2 + vPositionW.y * factor2 * 0.5) + cos(vPositionW.y * factor2 + vPositionW.z * factor2 * 0.5) + cos(vPositionW.z * factor2 + vPositionW.x * factor2 * 0.5)) * 0.1;
      //float offset3 = (cos(vPositionW.x * factor3 + vPositionW.y * factor3 * 0.5) + cos(vPositionW.y * factor3 + vPositionW.z * factor3 * 0.5) + cos(vPositionW.z * factor3 + vPositionW.x * factor3 * 0.5)) * 0.1;

      float offset1 = 0.;
      float offset2 = 0.;
      float offset3 = 0.;

      baryPos.r += offset1;
      baryPos.g += offset2;
      baryPos.b += offset3;
      if (baryPos.r >= baryPos.g && baryPos.r >= baryPos.b) {
         color = color1;
         colorIndex = colorIndex1;
      }
      else if (baryPos.g >= baryPos.b && baryPos.g >= baryPos.b) {
         color = color2;
         colorIndex = colorIndex2;
      }
      else if (baryPos.b >= baryPos.r && baryPos.b >= baryPos.g) {
         color = color3;
         colorIndex = colorIndex3;
      }
      else {
         color = vec3(0., 0., 0.);
      }
   }

   if (colorIndex == 2) {
      if (vNormalW.y < 0.8) {
         color = terrainColors[3];
      }
   }

   /*
   // show triangles
   if (baryPos.r < 0.005) {
      color = vec3(0., 0., 0.);
   }
   if (baryPos.g < 0.005) {
      color = vec3(0., 0., 0.);
   }
   if (baryPos.b < 0.005) {
      color = vec3(0., 0., 0.);
   }

   // show Chunck Parts
   float dx = vPositionW.x + 0.5 - floor(vPositionW.x + 0.5);
   float dy = vPositionW.y + 0.5 - floor(vPositionW.y + 0.5);
   float dz = vPositionW.z + 0.5 - floor(vPositionW.z + 0.5);

   if (dx < 0.005 || dx > 0.995) {
      color = vec3(1., 0., 1.);
   }
   if (dy < 0.005 || dy > 0.995) {
      color = vec3(1., 0., 1.);
   }
   if (dz < 0.005 || dz > 0.995) {
      color = vec3(1., 0., 1.);
   }

   // show grid
   float dx = vPositionW.x - floor(vPositionW.x);
   float dz = vPositionW.z - floor(vPositionW.z);

   if (dx < 0.005 || dx > 0.995) {
      color = vec3(0.1, 0., 0.1);
   }
   if (dz < 0.005 || dz > 0.995) {
      color = vec3(0.1, 0., 0.1);
   }
   */
   
   if (level == 0) {
      float dy = vPositionW.y / blockSize_m - floor(vPositionW.y / blockSize_m);
      if (vNormalW.y > 0.8 && (dy < 0.1 || dy > 0.9)) {
         lightFactor *= 1.3;
      }
   }
   else if (level == 1) {
      float dy = vPositionW.y / blockSize_m - floor(vPositionW.y / blockSize_m);
      if (vNormalW.y > 0.7 && (dy < 0.1 || dy > 0.9)) {
         lightFactor *= 1.3;
      }
   }
   else {
      if (vNormalW.y > 0.9) {
         lightFactor *= 1.3;
      }
      else if (vNormalW.y > 0.8) {
         lightFactor *= 1. + 0.3 * ((vNormalW.y - 0.8) * 10.);
      }
   }

   lightFactor = round(lightFactor * 12.) / 12.;

   /*
   if (dx < 0.02 || dx > 0.98) {
      lightFactor *= 0.6;
   }
   if (dz < 0.02 || dz > 0.98) {
      lightFactor *= 0.6;
   }
   */

   
   outColor = vec4(color * lightFactor, 1.);
}