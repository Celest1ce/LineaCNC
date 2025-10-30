/**
 * Rendu WebGL2 du maillage
 */
class MeshRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { antialias: true });
        this.isSupported = !!this.gl;
        this.model = null;
        this.colorScale = options.colorScale || new ColorScale();
        this.currentPalette = this.colorScale;
        this.zScale = 1;
        this.smoothingLevel = 0;
        this.smoothingKernel = 'gaussian';
        this.paletteMode = 'sync';
        this.camera = {
            azimuth: -Math.PI / 4,
            elevation: Math.PI / 5,
            distance: 2.8,
            target: [0, 0, 0]
        };
        this.isDragging = false;
        this.lastPointer = null;
        this.buffers = {
            vao: null,
            vertexCount: 0
        };
        this.stats = {
            vertices: 0,
            triangles: 0
        };
        this.needsRender = true;
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);
        this.attachEvents();
        if (this.isSupported) {
            this.initGL();
            this.resize();
            this.startLoop();
        } else {
            console.warn('WebGL2 non supporté par le navigateur.');
        }
    }

    initGL() {
        const gl = this.gl;
        const vertexSource = `#version 300 es
            precision highp float;
            layout(location = 0) in vec3 aPosition;
            layout(location = 1) in vec3 aNormal;
            layout(location = 2) in vec3 aColor;
            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform mat4 uModel;
            uniform mat3 uNormalMatrix;
            out vec3 vNormal;
            out vec3 vColor;
            void main() {
                vNormal = normalize(uNormalMatrix * aNormal);
                vColor = aColor;
                gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
            }
        `;
        const fragmentSource = `#version 300 es
            precision highp float;
            in vec3 vNormal;
            in vec3 vColor;
            uniform vec3 uLightDirection;
            out vec4 outColor;
            void main() {
                float lighting = max(dot(normalize(vNormal), normalize(uLightDirection)), 0.0);
                float ambient = 0.25;
                float intensity = clamp(ambient + lighting, 0.0, 1.0);
                outColor = vec4(vColor * intensity, 1.0);
            }
        `;
        this.program = this.createProgram(vertexSource, fragmentSource);
        if (!this.program) {
            this.isSupported = false;
            return;
        }
        this.uniformLocations = {
            projection: gl.getUniformLocation(this.program, 'uProjection'),
            view: gl.getUniformLocation(this.program, 'uView'),
            model: gl.getUniformLocation(this.program, 'uModel'),
            normalMatrix: gl.getUniformLocation(this.program, 'uNormalMatrix'),
            lightDir: gl.getUniformLocation(this.program, 'uLightDirection')
        };
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    }

    createShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Erreur compilation shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vertexShader = this.createShader(vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = this.createShader(fragmentSource, gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) {
            return null;
        }
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Erreur linkage programme:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return program;
    }

    setModel(model) {
        this.model = model;
        this.updateBuffers();
    }

    setColorScale(scale) {
        this.colorScale = scale;
        if (this.paletteMode === 'sync') {
            this.currentPalette = scale;
        }
        this.updateBuffers();
    }

    setRendererPalette(name) {
        this.paletteMode = name === 'sync' ? 'sync' : 'custom';
        if (name === 'sync') {
            this.currentPalette = this.colorScale;
        } else {
            const palettes = {
                sunset: new ColorScale({
                    name: 'sunset',
                    stops: [
                        { position: 0, color: '#0f172a' },
                        { position: 0.35, color: '#7f1d1d' },
                        { position: 0.7, color: '#fb923c' },
                        { position: 1, color: '#fde68a' }
                    ]
                }),
                ice: new ColorScale({
                    name: 'ice',
                    stops: [
                        { position: 0, color: '#0f172a' },
                        { position: 0.4, color: '#1e3a8a' },
                        { position: 0.7, color: '#38bdf8' },
                        { position: 1, color: '#e0f2fe' }
                    ]
                }),
                forest: new ColorScale({
                    name: 'forest',
                    stops: [
                        { position: 0, color: '#052e16' },
                        { position: 0.4, color: '#166534' },
                        { position: 0.7, color: '#4ade80' },
                        { position: 1, color: '#bbf7d0' }
                    ]
                })
            };
            this.currentPalette = palettes[name] || this.colorScale;
        }
        this.updateBuffers();
    }

    setZScale(value) {
        this.zScale = value;
        this.updateBuffers(false);
    }

    setSmoothing(level) {
        this.smoothingLevel = level;
        this.updateBuffers();
    }

    setSmoothingKernel(kernel) {
        this.smoothingKernel = kernel;
        this.updateBuffers();
    }

    resize() {
        if (!this.isSupported) return;
        const gl = this.gl;
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(this.canvas.clientWidth * dpr);
        const height = Math.floor(this.canvas.clientHeight * dpr);
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            gl.viewport(0, 0, width, height);
            this.needsRender = true;
        }
    }

    attachEvents() {
        this.canvas.addEventListener('pointerdown', (event) => {
            this.isDragging = true;
            this.lastPointer = { x: event.clientX, y: event.clientY };
            this.canvas.setPointerCapture?.(event.pointerId);
        });
        this.canvas.addEventListener('pointermove', (event) => {
            if (!this.isDragging) return;
            const dx = event.clientX - this.lastPointer.x;
            const dy = event.clientY - this.lastPointer.y;
            this.lastPointer = { x: event.clientX, y: event.clientY };
            this.camera.azimuth += dx * 0.005;
            this.camera.elevation += dy * 0.005;
            const limit = Math.PI / 2 - 0.05;
            this.camera.elevation = Math.min(limit, Math.max(-limit, this.camera.elevation));
            this.needsRender = true;
        });
        window.addEventListener('pointerup', (event) => {
            if (this.isDragging) {
                this.isDragging = false;
                this.canvas.releasePointerCapture?.(event.pointerId);
            }
        });
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.camera.distance *= 1 + Math.sign(event.deltaY) * 0.1;
            this.camera.distance = Math.min(8, Math.max(0.8, this.camera.distance));
            this.needsRender = true;
        }, { passive: false });
        this.canvas.addEventListener('dblclick', () => this.resetCamera());
    }

    resetCamera() {
        this.camera.azimuth = -Math.PI / 4;
        this.camera.elevation = Math.PI / 5;
        this.camera.distance = 2.8;
        this.needsRender = true;
    }

    topCamera() {
        this.camera.azimuth = 0;
        this.camera.elevation = -Math.PI / 2 + 0.01;
        this.camera.distance = 2;
        this.needsRender = true;
    }

    isoCamera() {
        this.camera.azimuth = -Math.PI / 4;
        this.camera.elevation = -Math.PI / 4;
        this.camera.distance = 2.2;
        this.needsRender = true;
    }

    startLoop() {
        const loop = () => {
            if (this.needsRender) {
                this.render();
                this.needsRender = false;
            }
            requestAnimationFrame(loop);
        };
        loop();
    }

    updateBuffers(recomputeGeometry = true) {
        if (!this.isSupported || !this.model || !this.model.hasData()) {
            this.buffers.vertexCount = 0;
            this.needsRender = true;
            return;
        }

        if (!recomputeGeometry && this.buffers.vertexCount) {
            this.updateHeightValues();
            this.needsRender = true;
            return;
        }

        const values = this.buildHeightField();
        const geometry = this.buildGeometry(values);
        this.uploadGeometry(geometry);
        this.stats.vertices = geometry.positions.length / 3;
        this.stats.triangles = geometry.indices.length / 3;
        this.needsRender = true;
    }

    buildHeightField() {
        const base = new Float32Array(this.model.values);
        const rows = this.model.rows;
        const cols = this.model.cols;
        const iterations = Math.max(0, Math.floor(this.smoothingLevel));
        if (iterations === 0 || this.smoothingKernel === 'none') {
            return base;
        }
        let buffer = base;
        for (let i = 0; i < iterations; i++) {
            buffer = this.applySmoothing(buffer, rows, cols);
        }
        return buffer;
    }

    applySmoothing(values, rows, cols) {
        const result = new Float32Array(values.length);
        const kernelType = this.smoothingKernel;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const index = r * cols + c;
                if (!Number.isFinite(values[index])) {
                    result[index] = values[index];
                    continue;
                }
                const neighbors = [];
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                        const nIndex = nr * cols + nc;
                        if (Number.isFinite(values[nIndex])) {
                            neighbors.push(values[nIndex]);
                        }
                    }
                }
                if (!neighbors.length) {
                    result[index] = values[index];
                    continue;
                }
                if (kernelType === 'median') {
                    neighbors.sort((a, b) => a - b);
                    const mid = Math.floor(neighbors.length / 2);
                    result[index] = neighbors.length % 2 === 0
                        ? (neighbors[mid - 1] + neighbors[mid]) / 2
                        : neighbors[mid];
                } else {
                    const weight = kernelType === 'gaussian' ? [1, 2, 1] : [1, 1, 1];
                    let sum = 0;
                    let total = 0;
                    let idx = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                            const nIndex = nr * cols + nc;
                            if (!Number.isFinite(values[nIndex])) continue;
                            const w = kernelType === 'gaussian'
                                ? weight[dr + 1] * weight[dc + 1]
                                : 1;
                            sum += values[nIndex] * w;
                            total += w;
                            idx++;
                        }
                    }
                    result[index] = total > 0 ? sum / total : values[index];
                }
            }
        }
        return result;
    }

    buildGeometry(values) {
        const rows = this.model.rows;
        const cols = this.model.cols;
        const positions = [];
        const normals = [];
        const colors = [];
        const indices = [];

        const stats = this.model.computeStats();
        const min = Number.isFinite(stats.min) ? stats.min : 0;
        const max = Number.isFinite(stats.max) ? stats.max : 1;
        const palette = this.currentPalette || this.colorScale;

        const scaleX = 1 / Math.max(1, cols - 1);
        const scaleZ = 1 / Math.max(1, rows - 1);

        const getHeight = (r, c) => {
            const value = values[r * cols + c];
            return Number.isFinite(value) ? value * this.zScale : 0;
        };

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = (c * scaleX) - 0.5;
                const z = (r * scaleZ) - 0.5;
                const y = getHeight(r, c);
                positions.push(x, y, z);

                const center = values[r * cols + c];
                const left = c > 0 ? values[r * cols + (c - 1)] : center;
                const right = c < cols - 1 ? values[r * cols + (c + 1)] : center;
                const up = r > 0 ? values[(r - 1) * cols + c] : center;
                const down = r < rows - 1 ? values[(r + 1) * cols + c] : center;
                const dx = Number.isFinite(left) && Number.isFinite(right) ? (right - left) : 0;
                const dz = Number.isFinite(up) && Number.isFinite(down) ? (down - up) : 0;
                const normal = this.normalize([-dx * this.zScale, 2, -dz * this.zScale]);
                normals.push(...normal);

                let value = values[r * cols + c];
                if (!Number.isFinite(value)) {
                    value = stats.mean || 0;
                }
                const rgb = palette.getColor(value, min, max).map(v => v / 255);
                colors.push(rgb[0], rgb[1], rgb[2]);
            }
        }

        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const i0 = r * cols + c;
                const i1 = i0 + 1;
                const i2 = i0 + cols;
                const i3 = i2 + 1;
                indices.push(i0, i2, i1);
                indices.push(i1, i2, i3);
            }
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            colors: new Float32Array(colors),
            indices: new Uint32Array(indices)
        };
    }

    uploadGeometry(geometry) {
        const gl = this.gl;
        if (!this.buffers.vao) {
            this.buffers.vao = gl.createVertexArray();
            this.buffers.positionBuffer = gl.createBuffer();
            this.buffers.normalBuffer = gl.createBuffer();
            this.buffers.colorBuffer = gl.createBuffer();
            this.buffers.indexBuffer = gl.createBuffer();
        }
        gl.bindVertexArray(this.buffers.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.colors, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

        this.buffers.vertexCount = geometry.indices.length;
        gl.bindVertexArray(null);
    }

    updateHeightValues() {
        // For future dynamic updates if we store heights separately
        this.updateBuffers(true);
    }

    render() {
        if (!this.isSupported) return;
        const gl = this.gl;
        gl.clearColor(0.04, 0.07, 0.11, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (!this.buffers.vertexCount) return;

        gl.useProgram(this.program);
        gl.bindVertexArray(this.buffers.vao);

        const projection = this.perspectiveMatrix(Math.PI / 3, this.canvas.width / this.canvas.height, 0.1, 50);
        const view = this.viewMatrix();
        const model = this.modelMatrix();
        const normalMatrix = this.normalMatrix(model, view);

        gl.uniformMatrix4fv(this.uniformLocations.projection, false, projection);
        gl.uniformMatrix4fv(this.uniformLocations.view, false, view);
        gl.uniformMatrix4fv(this.uniformLocations.model, false, model);
        gl.uniformMatrix3fv(this.uniformLocations.normalMatrix, false, normalMatrix);
        gl.uniform3fv(this.uniformLocations.lightDir, new Float32Array([-0.4, 0.6, 0.8]));

        gl.drawElements(gl.TRIANGLES, this.buffers.vertexCount, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
    }

    perspectiveMatrix(fov, aspect, near, far) {
        const f = 1 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        const out = new Float32Array(16);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[14] = (2 * far * near) * nf;
        return out;
    }

    viewMatrix() {
        const eye = this.sphericalToCartesian(this.camera.distance, this.camera.azimuth, this.camera.elevation);
        const target = this.camera.target;
        const up = [0, 1, 0];
        return this.lookAtMatrix(eye, target, up);
    }

    modelMatrix() {
        const out = new Float32Array(16);
        for (let i = 0; i < 16; i++) out[i] = 0;
        out[0] = 1;
        out[5] = 1;
        out[10] = 1;
        out[15] = 1;
        return out;
    }

    normalMatrix(model, view) {
        const mv = this.multiplyMatrix4(view, model);
        const n = new Float32Array(9);
        const a00 = mv[0], a01 = mv[1], a02 = mv[2];
        const a10 = mv[4], a11 = mv[5], a12 = mv[6];
        const a20 = mv[8], a21 = mv[9], a22 = mv[10];
        const det = a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20);
        if (!det) {
            return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        }
        const invDet = 1 / det;
        n[0] = (a11 * a22 - a12 * a21) * invDet;
        n[1] = (a02 * a21 - a01 * a22) * invDet;
        n[2] = (a01 * a12 - a02 * a11) * invDet;
        n[3] = (a12 * a20 - a10 * a22) * invDet;
        n[4] = (a00 * a22 - a02 * a20) * invDet;
        n[5] = (a02 * a10 - a00 * a12) * invDet;
        n[6] = (a10 * a21 - a11 * a20) * invDet;
        n[7] = (a01 * a20 - a00 * a21) * invDet;
        n[8] = (a00 * a11 - a01 * a10) * invDet;
        return n;
    }

    lookAtMatrix(eye, target, up) {
        const [ex, ey, ez] = eye;
        const [tx, ty, tz] = target;
        let zx = ex - tx;
        let zy = ey - ty;
        let zz = ez - tz;
        const zLength = Math.hypot(zx, zy, zz);
        if (zLength === 0) {
            zx = 0;
            zy = 0;
            zz = 1;
        } else {
            zx /= zLength;
            zy /= zLength;
            zz /= zLength;
        }
        let xx = up[1] * zz - up[2] * zy;
        let xy = up[2] * zx - up[0] * zz;
        let xz = up[0] * zy - up[1] * zx;
        let xLength = Math.hypot(xx, xy, xz);
        if (xLength === 0) {
            xx = 0;
            xy = 0;
            xz = 0;
        } else {
            xx /= xLength;
            xy /= xLength;
            xz /= xLength;
        }
        let yx = zy * xz - zz * xy;
        let yy = zz * xx - zx * xz;
        let yz = zx * xy - zy * xx;
        const out = new Float32Array(16);
        out[0] = xx;
        out[1] = yx;
        out[2] = zx;
        out[3] = 0;
        out[4] = xy;
        out[5] = yy;
        out[6] = zy;
        out[7] = 0;
        out[8] = xz;
        out[9] = yz;
        out[10] = zz;
        out[11] = 0;
        out[12] = -(xx * ex + xy * ey + xz * ez);
        out[13] = -(yx * ex + yy * ey + yz * ez);
        out[14] = -(zx * ex + zy * ey + zz * ez);
        out[15] = 1;
        return out;
    }

    multiplyMatrix4(a, b) {
        const out = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
        return out;
    }

    sphericalToCartesian(distance, azimuth, elevation) {
        const x = distance * Math.cos(elevation) * Math.sin(azimuth);
        const y = distance * Math.sin(elevation);
        const z = distance * Math.cos(elevation) * Math.cos(azimuth);
        return [x, y, z];
    }

    normalize(vector) {
        const length = Math.hypot(vector[0], vector[1], vector[2]);
        if (!length) return [0, 1, 0];
        return [vector[0] / length, vector[1] / length, vector[2] / length];
    }

    getCameraInfo() {
        return {
            distance: this.camera.distance,
            azimuth: this.camera.azimuth,
            elevation: this.camera.elevation
        };
    }
}

window.MeshRenderer = MeshRenderer;
