/**
 * Composant de visualisation 3D de mesh avec WebGL2
 * Rendu 3D interactif avec caméra orbitale
 */

import { useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Eye } from 'lucide-react';
import type { MeshData, MeshViewer3DConfig } from '../../types/mesh';
import type { ColorScale } from '../../utils/color-scale.utils';
import { Button } from '../UI/Button';
import {
  getWebGL2Context,
  setupWebGL,
  createShaderProgram,
  createBuffer,
  Mat4,
  OrbitCamera,
  resizeCanvasToDisplaySize,
} from '../../utils/webgl-helpers.utils';
import { hexToRgb } from '../../utils/color-scale.utils';

interface MeshViewer3DProps {
  mesh: MeshData;
  colorScale: ColorScale;
  config: MeshViewer3DConfig;
  onConfigChange?: (config: Partial<MeshViewer3DConfig>) => void;
}

// Shaders
const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uZScale;

out vec3 vColor;

void main() {
  vec4 pos = vec4(aPosition, 1.0);
  pos = uZScale * pos;
  gl_Position = uProjection * uView * pos;
  vColor = aColor;
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {
  fragColor = vec4(vColor, 1.0);
}
`;

export const MeshViewer3D: React.FC<MeshViewer3DProps> = ({
  mesh,
  colorScale,
  config,
  onConfigChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
  const cameraRef = useRef<OrbitCamera>(
    new OrbitCamera(config.camera.azimuth, config.camera.elevation, config.camera.distance)
  );
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Refs pour la géométrie des axes
  const axesVaoRef = useRef<WebGLVertexArrayObject | null>(null);
  const axesIndexCountRef = useRef(0);

  // Ref pour le nombre réel d'indices du mesh
  const meshIndexCountRef = useRef(0);

  /**
   * Initialise WebGL
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = getWebGL2Context(canvas);
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }

    glRef.current = gl;
    setupWebGL(gl);

    // Désactive le blending pour avoir un rendu complètement opaque
    gl.disable(gl.BLEND);

    // Compile les shaders
    const program = createShaderProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    if (!program) {
      console.error('Failed to create shader program');
      return;
    }

    programRef.current = program;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  /**
   * Construit la géométrie des axes X/Y/Z
   */
  const buildAxesGeometry = useCallback(() => {
    const axisLength = 0.5;
    // Position de l'origine des axes dans le coin inférieur gauche
    const originX = -1.2;
    const originY = -0.5;
    const originZ = -1.2;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Axe X (rouge)
    positions.push(originX, originY, originZ);  // Origine
    colors.push(1, 0, 0);     // Rouge
    positions.push(originX + axisLength, originY, originZ);  // Extrémité X
    colors.push(1, 0, 0);     // Rouge

    // Axe Y (vert)
    positions.push(originX, originY, originZ);  // Origine
    colors.push(0, 1, 0);     // Vert
    positions.push(originX, originY + axisLength, originZ);  // Extrémité Y
    colors.push(0, 1, 0);     // Vert

    // Axe Z (bleu)
    positions.push(originX, originY, originZ);  // Origine
    colors.push(0, 0, 1);     // Bleu
    positions.push(originX, originY, originZ + axisLength);  // Extrémité Z
    colors.push(0, 0, 1);     // Bleu

    // Indices pour les lignes
    indices.push(0, 1); // X
    indices.push(2, 3); // Y
    indices.push(4, 5); // Z

    return { positions, colors, indices };
  }, []);

  /**
   * Upload la géométrie des axes vers le GPU
   */
  const uploadAxesGeometry = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    const { positions, colors, indices } = buildAxesGeometry();

    // Crée le VAO pour les axes
    const vao = gl.createVertexArray();
    if (!vao) return;

    gl.bindVertexArray(vao);

    // Position buffer
    const positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(positions));
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    // Color buffer
    const colorBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(colors));
    const aColor = gl.getAttribLocation(program, 'aColor');
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

    // Index buffer
    createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices));

    gl.bindVertexArray(null);

    axesVaoRef.current = vao;
    axesIndexCountRef.current = indices.length;
  }, [buildAxesGeometry]);

  /**
   * Construit la géométrie du mesh
   */
  const buildGeometry = useCallback(() => {
    const { width, height, values } = mesh;
    const { smoothingLevel } = config;

    // Nombre de subdivisions
    const subdivisions = 1 << smoothingLevel; // 1, 2, 4, 8

    const verticesPerCell = (subdivisions + 1) * (subdivisions + 1);

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    let vertexIndex = 0;

    // Pour chaque cellule du grid
    for (let gy = 0; gy < height - 1; gy++) {
      for (let gx = 0; gx < width - 1; gx++) {
        // Valeurs aux coins de la cellule
        const v00 = values[gy * width + gx];
        const v10 = values[gy * width + (gx + 1)];
        const v01 = values[(gy + 1) * width + gx];
        const v11 = values[(gy + 1) * width + (gx + 1)];

        // Skip cette cellule si au moins une valeur est manquante
        if (!isFinite(v00) || !isFinite(v10) || !isFinite(v01) || !isFinite(v11)) {
          continue;
        }

        // Subdivise la cellule
        for (let sy = 0; sy <= subdivisions; sy++) {
          for (let sx = 0; sx <= subdivisions; sx++) {
            const u = sx / subdivisions;
            const v = sy / subdivisions;

            // Position interpolée
            // Note: Z est inversé pour correspondre à l'orientation physique de l'imprimante
            // gy=0 (front) doit être loin (z positif), gy=max (back) proche (z négatif)
            const x = ((gx + u) / (width - 1) - 0.5) * 2;
            const z = ((height - 1 - (gy + v)) / (height - 1) - 0.5) * 2;

            // Interpolation bilinéaire de la hauteur
            const h0 = v00 * (1 - u) + v10 * u;
            const h1 = v01 * (1 - u) + v11 * u;
            const y = h0 * (1 - v) + h1 * v;

            positions.push(x, y, z);

            // Couleur
            const color = colorScale.getColor(y);
            const [r, g, b] = hexToRgb(color);
            colors.push(r / 255, g / 255, b / 255);
          }
        }

        // Crée les indices pour les triangles
        const baseIndex = vertexIndex;
        for (let sy = 0; sy < subdivisions; sy++) {
          for (let sx = 0; sx < subdivisions; sx++) {
            const i0 = baseIndex + sy * (subdivisions + 1) + sx;
            const i1 = i0 + 1;
            const i2 = i0 + (subdivisions + 1);
            const i3 = i2 + 1;

            // Premier triangle
            indices.push(i0, i1, i2);
            // Second triangle
            indices.push(i1, i3, i2);
          }
        }

        vertexIndex += verticesPerCell;
      }
    }

    return { positions, colors, indices };
  }, [mesh, colorScale, config.smoothingLevel]);

  /**
   * Upload la géométrie vers le GPU
   */
  const uploadGeometry = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    const { positions, colors, indices } = buildGeometry();

    // Crée le VAO
    const vao = gl.createVertexArray();
    if (!vao) return;

    gl.bindVertexArray(vao);

    // Position buffer
    const positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(positions));
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    // Color buffer
    const colorBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(colors));
    const aColor = gl.getAttribLocation(program, 'aColor');
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

    // Index buffer
    createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices));

    gl.bindVertexArray(null);

    vaoRef.current = vao;
    meshIndexCountRef.current = indices.length;

    return indices.length;
  }, [buildGeometry]);

  /**
   * Render loop
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const program = programRef.current;
    const vao = vaoRef.current;

    if (!canvas || !gl || !program || !vao) return;

    // Redimensionne le canvas si nécessaire
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Efface
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use program
    gl.useProgram(program);

    // Projection matrix
    const aspect = canvas.width / canvas.height;
    const projection = Mat4.perspective(Math.PI / 4, aspect, 0.1, 100);

    // View matrix
    const camera = cameraRef.current;
    const view = camera.getViewMatrix();

    // Z-scale matrix
    const zScale = Mat4.scale(1, config.zScale, 1);

    // Upload uniforms
    const uProjection = gl.getUniformLocation(program, 'uProjection');
    const uView = gl.getUniformLocation(program, 'uView');
    const uZScale = gl.getUniformLocation(program, 'uZScale');

    gl.uniformMatrix4fv(uProjection, false, projection.data);
    gl.uniformMatrix4fv(uView, false, view.data);
    gl.uniformMatrix4fv(uZScale, false, zScale.data);

    // Draw mesh
    gl.bindVertexArray(vao);

    // Utilise le nombre réel d'indices (stocké lors de l'upload)
    const indicesCount = meshIndexCountRef.current;

    if (indicesCount > 0) {
      gl.drawElements(gl.TRIANGLES, indicesCount, gl.UNSIGNED_INT, 0);
    }

    gl.bindVertexArray(null);

    // Draw axes si activé
    if (config.showAxes && axesVaoRef.current && axesIndexCountRef.current > 0) {
      // Matrice d'échelle pour les axes (ne pas appliquer zScale)
      const identityScale = Mat4.scale(1, 1, 1);
      gl.uniformMatrix4fv(uZScale, false, identityScale.data);

      gl.bindVertexArray(axesVaoRef.current);

      // Augmente la largeur des lignes pour les axes
      gl.lineWidth(3);

      gl.drawElements(gl.LINES, axesIndexCountRef.current, gl.UNSIGNED_INT, 0);

      gl.lineWidth(1);
      gl.bindVertexArray(null);
    }
  }, [config.zScale, config.showAxes]);

  /**
   * Boucle d'animation
   */
  const animate = useCallback(() => {
    render();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [render]);

  /**
   * Démarre l'animation quand tout est prêt
   */
  useEffect(() => {
    const indicesCount = uploadGeometry();
    uploadAxesGeometry(); // Upload axes geometry

    if (indicesCount) {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [uploadGeometry, uploadAxesGeometry, animate]);

  /**
   * Gestion de la souris pour la caméra
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - lastMouseRef.current.x;
    const deltaY = e.clientY - lastMouseRef.current.y;

    const camera = cameraRef.current;
    camera.rotate(-deltaX * 0.01, deltaY * 0.01);

    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    // Met à jour la config
    if (onConfigChange) {
      onConfigChange({
        camera: {
          azimuth: camera.azimuth,
          elevation: camera.elevation,
          distance: camera.distance,
        },
      });
    }
  }, [onConfigChange]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const camera = cameraRef.current;
    camera.zoom(e.deltaY * 0.001);

    if (onConfigChange) {
      onConfigChange({
        camera: {
          azimuth: camera.azimuth,
          elevation: camera.elevation,
          distance: camera.distance,
        },
      });
    }
  }, [onConfigChange]);

  /**
   * Réinitialise la caméra
   */
  const resetCamera = useCallback(() => {
    const camera = cameraRef.current;
    camera.resetToIsometric();

    if (onConfigChange) {
      onConfigChange({
        camera: {
          azimuth: camera.azimuth,
          elevation: camera.elevation,
          distance: camera.distance,
        },
      });
    }
  }, [onConfigChange]);

  /**
   * Vue de dessus
   */
  const topView = useCallback(() => {
    const camera = cameraRef.current;
    camera.setTopView();

    if (onConfigChange) {
      onConfigChange({
        camera: {
          azimuth: camera.azimuth,
          elevation: camera.elevation,
          distance: camera.distance,
        },
      });
    }
  }, [onConfigChange]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 rounded-lg bg-gray-900 overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />
      </div>

      {/* Légende de couleur */}
      <div className="flex items-center gap-2 text-xs mt-2">
        <span className="text-gray-600">{colorScale.getConfig().min.toFixed(2)} mm</span>
        <div
          className="flex-1 h-4 rounded"
          style={{ background: colorScale.toCssGradient() }}
        />
        <span className="text-gray-600">{colorScale.getConfig().max.toFixed(2)} mm</span>
      </div>

      {/* Aide pour les contrôles */}
      <div className="mt-1 text-[10px] text-gray-500 text-center">
        Drag: Rotation | Scroll: Zoom
      </div>

      {/* Boutons de vue rapide (petit, en overlay) */}
      <div className="absolute top-2 right-2 flex gap-1">
        <Button
          onClick={resetCamera}
          variant="secondary"
          className="text-xs py-1 px-2 bg-white bg-opacity-90 hover:bg-opacity-100"
          title="Réinitialiser la vue"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
        <Button
          onClick={topView}
          variant="secondary"
          className="text-xs py-1 px-2 bg-white bg-opacity-90 hover:bg-opacity-100"
          title="Vue de dessus"
        >
          <Eye className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
