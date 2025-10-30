/**
 * Modèle de données représentant un maillage rectiligne
 */
class MeshModel {
    constructor() {
        this.rows = 0;
        this.cols = 0;
        this.values = new Float32Array(0);
        this.mask = new Uint8Array(0); // 0: original, 1: manquant, 2: imputé
        this.metadata = {};
        this.history = [];
        this.future = [];
        this.maxHistory = 100;
        this.preview = null;
    }

    hasData() {
        return this.values.length > 0;
    }

    load(matrix, options = {}) {
        const { mask = null, metadata = {} } = options;
        const rows = matrix.length;
        const cols = matrix[0].length;

        this.rows = rows;
        this.cols = cols;
        this.values = new Float32Array(rows * cols);
        this.mask = new Uint8Array(rows * cols);
        this.metadata = { ...metadata };
        this.history = [];
        this.future = [];
        this.preview = null;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const index = this.index(r, c);
                const value = matrix[r][c];
                if (mask && mask[index] === 1) {
                    this.values[index] = NaN;
                    this.mask[index] = 1;
                    continue;
                }

                if (!Number.isFinite(value)) {
                    this.values[index] = NaN;
                    this.mask[index] = 1;
                } else {
                    this.values[index] = Number(value);
                    if (mask && mask[index] === 2) {
                        this.mask[index] = 2;
                    } else {
                        this.mask[index] = 0;
                    }
                }
            }
        }
    }

    index(row, col) {
        return row * this.cols + col;
    }

    coordinates(index) {
        return [Math.floor(index / this.cols), index % this.cols];
    }

    snapshot() {
        return {
            values: new Float32Array(this.values),
            mask: new Uint8Array(this.mask),
            metadata: { ...this.metadata }
        };
    }

    restore(snapshot) {
        this.values = new Float32Array(snapshot.values);
        this.mask = new Uint8Array(snapshot.mask);
        this.metadata = { ...snapshot.metadata };
        this.preview = null;
    }

    pushHistory() {
        if (!this.hasData()) return;
        this.history.push(this.snapshot());
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        this.future = [];
    }

    undo() {
        if (!this.history.length) return false;
        const snapshot = this.history.pop();
        this.future.push(this.snapshot());
        this.restore(snapshot);
        return true;
    }

    redo() {
        if (!this.future.length) return false;
        const snapshot = this.future.pop();
        this.history.push(this.snapshot());
        this.restore(snapshot);
        return true;
    }

    setValue(row, col, value, options = {}) {
        if (!this.hasData()) return;
        const { imputed = false, markMissing = false, skipHistory = false } = options;
        const index = this.index(row, col);

        if (!skipHistory) {
            this.pushHistory();
        }

        if (markMissing || !Number.isFinite(value)) {
            this.values[index] = NaN;
            this.mask[index] = 1;
        } else {
            this.values[index] = Number(value);
            this.mask[index] = imputed ? 2 : 0;
        }
        this.preview = null;
    }

    bulkUpdate(updates, options = {}) {
        if (!this.hasData() || !Array.isArray(updates) || !updates.length) return;
        const { imputed = false, markMissing = false } = options;
        this.pushHistory();
        for (const update of updates) {
            const { row, col, value } = update;
            const index = this.index(row, col);
            if (markMissing || !Number.isFinite(value)) {
                this.values[index] = NaN;
                this.mask[index] = 1;
            } else {
                this.values[index] = Number(value);
                this.mask[index] = imputed ? 2 : 0;
            }
        }
        this.preview = null;
    }

    fillMissing(value) {
        if (!this.hasData()) return;
        const updates = [];
        for (let index = 0; index < this.values.length; index++) {
            if (this.mask[index] === 1) {
                const [row, col] = this.coordinates(index);
                updates.push({ row, col, value });
            }
        }
        this.bulkUpdate(updates, { imputed: true });
    }

    getValue(row, col) {
        return this.values[this.index(row, col)];
    }

    getMask(row, col) {
        return this.mask[this.index(row, col)];
    }

    getMatrix() {
        const matrix = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(this.values[this.index(r, c)]);
            }
            matrix.push(row);
        }
        return matrix;
    }

    computeStats() {
        return MeshStats.compute(this.values, this.mask);
    }

    detectNeighbors(row, col) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
                const index = this.index(nr, nc);
                if (this.mask[index] !== 1 && Number.isFinite(this.values[index])) {
                    neighbors.push({ value: this.values[index], row: nr, col: nc });
                }
            }
        }
        return neighbors;
    }

    buildMedianCorrection(options = {}) {
        if (!this.hasData()) {
            return { corrections: [] };
        }
        const { includeImputed = false } = options;
        const corrections = [];
        for (let index = 0; index < this.values.length; index++) {
            const state = this.mask[index];
            if (state === 1 || (includeImputed && state === 2)) {
                const [row, col] = this.coordinates(index);
                const neighbors = this.detectNeighbors(row, col);
                if (!neighbors.length) continue;
                const sorted = neighbors.map(n => n.value).sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
                const mean = neighbors.reduce((acc, curr) => acc + curr.value, 0) / neighbors.length;
                const candidate = Number.isFinite(median) ? median : mean;
                if (Number.isFinite(candidate)) {
                    corrections.push({ row, col, value: candidate });
                }
            }
        }
        return { corrections };
    }

    setPreview(corrections) {
        this.preview = Array.isArray(corrections) ? corrections.slice() : null;
    }

    clearPreview() {
        this.preview = null;
    }

    applyCorrections(corrections) {
        if (!Array.isArray(corrections) || !corrections.length) return;
        this.bulkUpdate(corrections, { imputed: true });
    }

    getPreviewValue(row, col) {
        if (!this.preview) return null;
        return this.preview.find(item => item.row === row && item.col === col) || null;
    }

    toExportPayload() {
        return {
            rows: this.rows,
            cols: this.cols,
            values: Array.from(this.values, value => (Number.isFinite(value) ? value : null)),
            mask: Array.from(this.mask),
            metadata: {
                ...this.metadata,
                updatedAt: new Date().toISOString()
            }
        };
    }
}

window.MeshModel = MeshModel;
