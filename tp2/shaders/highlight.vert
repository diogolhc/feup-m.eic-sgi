#ifdef GL_ES
precision highp float;
#endif

attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;

varying vec4 coords;
varying vec4 normal;
varying vec2 vTextureCoord;
uniform float timeFactor;
uniform float highlightScale;
uniform vec4 highlightColor;

void main() {
	vec4 vertex=vec4(aVertexPosition+aVertexNormal*timeFactor*highlightScale, 1.0);

	gl_Position = uPMatrix * uMVMatrix * vertex;

	normal = vec4(aVertexNormal, 1.0);

	coords=vertex/10.0;
	vTextureCoord = aTextureCoord;
}