#version 300 es
precision highp float;

uniform vec3 terrainColors[22];

in vec3 position;
in vec3 normal;
in vec2 uv;
in vec2 uv2;
in vec4 color;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform vec3 lightInvDirW;

out vec3 vPositionL;
out vec3 vPositionW;
out vec3 vNormalL;
out vec3 vNormalW;
out vec2 vUv;
out vec2 vUv2;
out vec4 vColor;

void main()
{
  gl_Position = worldViewProjection * vec4(position, 1.);

  vPositionL = position;
  vPositionW = vec3(world * vec4(position, 1.0));
  vNormalL = normal;
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vColor = color;

  vUv = uv;
  vUv2 = uv2;
}