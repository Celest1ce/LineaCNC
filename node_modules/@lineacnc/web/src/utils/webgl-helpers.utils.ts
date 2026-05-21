/**
 * Utilitaires pour WebGL (shaders, buffers, matrices)
 */

/**
 * Compile un shader
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Erreur de compilation du shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Lie un programme shader
 */
export function linkProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Erreur de liaison du programme:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * Crée un programme shader complet
 */
export function createShaderProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = linkProgram(gl, vertexShader, fragmentShader);

  // Nettoyage
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Crée et remplit un buffer
 */
export function createBuffer(
  gl: WebGL2RenderingContext,
  target: number,
  data: BufferSource,
  usage: number = gl.STATIC_DRAW
): WebGLBuffer | null {
  const buffer = gl.createBuffer();
  if (!buffer) return null;

  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, usage);

  return buffer;
}

/**
 * Classe pour gérer les matrices 4x4
 */
export class Mat4 {
  data: Float32Array;

  constructor(data?: Float32Array) {
    this.data = data || new Float32Array(16);
    if (!data) {
      this.identity();
    }
  }

  /**
   * Matrice identité
   */
  identity(): Mat4 {
    this.data.fill(0);
    this.data[0] = 1;
    this.data[5] = 1;
    this.data[10] = 1;
    this.data[15] = 1;
    return this;
  }

  /**
   * Matrice de perspective
   */
  static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
    const mat = new Mat4();
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1.0 / (near - far);

    mat.data[0] = f / aspect;
    mat.data[5] = f;
    mat.data[10] = (near + far) * rangeInv;
    mat.data[11] = -1;
    mat.data[14] = near * far * rangeInv * 2;
    mat.data[15] = 0;

    return mat;
  }

  /**
   * Matrice lookAt
   */
  static lookAt(eye: [number, number, number], target: [number, number, number], up: [number, number, number]): Mat4 {
    const mat = new Mat4();

    // Vecteur Z (direction de la caméra)
    const zAxis = normalize(subtract(eye, target));

    // Vecteur X (droite)
    const xAxis = normalize(cross(up, zAxis));

    // Vecteur Y (haut)
    const yAxis = normalize(cross(zAxis, xAxis));

    mat.data[0] = xAxis[0];
    mat.data[1] = yAxis[0];
    mat.data[2] = zAxis[0];
    mat.data[3] = 0;

    mat.data[4] = xAxis[1];
    mat.data[5] = yAxis[1];
    mat.data[6] = zAxis[1];
    mat.data[7] = 0;

    mat.data[8] = xAxis[2];
    mat.data[9] = yAxis[2];
    mat.data[10] = zAxis[2];
    mat.data[11] = 0;

    mat.data[12] = -dot(xAxis, eye);
    mat.data[13] = -dot(yAxis, eye);
    mat.data[14] = -dot(zAxis, eye);
    mat.data[15] = 1;

    return mat;
  }

  /**
   * Multiplication de matrices
   */
  multiply(other: Mat4): Mat4 {
    const result = new Mat4();
    const a = this.data;
    const b = other.data;
    const r = result.data;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        r[row * 4 + col] =
          a[row * 4 + 0] * b[0 * 4 + col] +
          a[row * 4 + 1] * b[1 * 4 + col] +
          a[row * 4 + 2] * b[2 * 4 + col] +
          a[row * 4 + 3] * b[3 * 4 + col];
      }
    }

    return result;
  }

  /**
   * Matrice de scale
   */
  static scale(sx: number, sy: number, sz: number): Mat4 {
    const mat = new Mat4();
    mat.data[0] = sx;
    mat.data[5] = sy;
    mat.data[10] = sz;
    return mat;
  }
}

/**
 * Utilitaires vectoriels
 */

function subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Classe pour gérer une caméra orbitale
 */
export class OrbitCamera {
  azimuth: number; // Rotation horizontale (radians)
  elevation: number; // Rotation verticale (radians)
  distance: number; // Distance de la cible

  constructor(azimuth: number = 0, elevation: number = 0, distance: number = 3) {
    this.azimuth = azimuth;
    this.elevation = elevation;
    this.distance = distance;
  }

  /**
   * Obtient la position de la caméra dans l'espace
   */
  getPosition(): [number, number, number] {
    const x = this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth);
    const y = this.distance * Math.sin(this.elevation);
    const z = this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth);
    return [x, y, z];
  }

  /**
   * Génère la matrice de vue
   */
  getViewMatrix(): Mat4 {
    const eye = this.getPosition();
    const target: [number, number, number] = [0, 0, 0];
    const up: [number, number, number] = [0, 1, 0];
    return Mat4.lookAt(eye, target, up);
  }

  /**
   * Rotate la caméra
   */
  rotate(deltaAzimuth: number, deltaElevation: number): void {
    this.azimuth += deltaAzimuth;
    this.elevation = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.elevation + deltaElevation));
  }

  /**
   * Zoom
   */
  zoom(delta: number): void {
    this.distance = Math.max(0.5, Math.min(10, this.distance * (1 + delta)));
  }

  /**
   * Réinitialise à une vue isométrique
   */
  resetToIsometric(): void {
    this.azimuth = Math.PI / 4; // 45°
    this.elevation = Math.PI / 6; // 30°
    this.distance = 3;
  }

  /**
   * Vue de dessus
   */
  setTopView(): void {
    this.azimuth = 0;
    this.elevation = Math.PI / 2 - 0.01;
    this.distance = 3;
  }
}

/**
 * Gestion du contexte WebGL2
 */
export function getWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
  });

  if (!gl) {
    console.error('WebGL2 n\'est pas supporté sur ce navigateur');
    return null;
  }

  return gl;
}

/**
 * Configure les paramètres WebGL de base
 */
export function setupWebGL(gl: WebGL2RenderingContext): void {
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  // Désactive le backface culling pour voir le mesh de tous les angles
  gl.disable(gl.CULL_FACE);
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
}

/**
 * Redimensionne le canvas pour correspondre à la taille d'affichage
 */
export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}
