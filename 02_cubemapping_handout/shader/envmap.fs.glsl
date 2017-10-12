/**
 * simple environment mapping shader
 *
 */

//need to specify how "precise" float should be
precision mediump float;

varying vec3 v_normalVec;
varying vec3 v_cameraRayVec;

uniform bool u_useReflection;
uniform bool u_useRefraction;
uniform bool u_useFresnel;
uniform float u_refractionEta;
uniform float u_fresnelR0;

uniform samplerCube u_texCube;

float fresnel(vec3 direction, vec3 normal) {
    vec3 nDirection = normalize( direction );
    vec3 nNormal = normalize( normal );

    // --- TASK 3 ---

    float factor = 0.0;

    return factor;
}

//entry point again
void main() {
  vec3 normalVec = normalize(v_normalVec);
	vec3 cameraRayVec = normalize(v_cameraRayVec);

  vec3 texCoords = cameraRayVec;
  gl_FragColor = textureCube(u_texCube, texCoords);

  vec4 reflectColor = vec4(0.0,0.0,0.0,1.0);
  vec4 refractColor = vec4(0.0,0.0,0.0,1.0);
  if(u_useReflection)
  {
     // --- TASK 1 ---
     gl_FragColor = reflectColor; // black, just to see something ...
  }
  if(u_useRefraction)
  {
      // --- TASK 2 ---
  }


  if(u_useFresnel)
  {
      // --- TASK 3 ---
  }
}
