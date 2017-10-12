/**
 * simple environment mapping shader
 *
 */

//attributes: per vertex inputs in this case the 2d position and its color
attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;

//inverse view matrix to get from eye to world space
uniform mat3 u_invView3x3;

//output variables requried in fragment shader
varying vec3 v_normalVec;
varying vec3 v_cameraRayVec;

void main() {
  //calculate vertex position in eye space (!vertex position in eye space = camera ray in eye space!)
  vec4 eyePosition = u_modelView * vec4(a_position,1);

	v_cameraRayVec = mat3(u_invView3x3) * eyePosition.xyz;

	//calculate normal vector in world space
	v_normalVec = mat3(u_invView3x3) * u_normalMatrix * a_normal;

  //gl_Position ... output variable storing the vertex 4D position
  gl_Position = u_projection * eyePosition;
}
