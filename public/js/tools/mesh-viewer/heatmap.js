/**
 * Vue Heatmap 2D pour le Mesh Viewer
 */
class HeatmapView {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.model = null;
        this.colorScale = options.colorScale || new ColorScale();
        this.showGrid = true;
        this.showImputedOverlay = true;
        this.hoverCell = null;
        this.isPointerDown = false;
        this.paintMode = 'paint';
        this.brushSize = 1;
        this.brushValue = 0;
        this.lastPainted = new Set();
        this.onPaint = null;
        this.onHover = null;
        this.onCellClick = null;
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);
        this.attachEvents();
        this.resize();
    }

    setModel(model) {
        this.model = model;
        this.render();
    }

    setColorScale(scale) {
        this.colorScale = scale;
        this.render();
    }

    setPaintOptions({ mode, value, size }) {
        if (mode) this.paintMode = mode;
        if (Number.isFinite(value)) this.brushValue = value;
        if (Number.isFinite(size)) this.brushSize = Math.max(1, Math.round(size));
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.render();
        return this.showGrid;
    }

    toggleStatistics() {
        return true;
    }

    setImputedOverlay(value) {
        this.showImputedOverlay = value;
        this.render();
    }

    attachEvents() {
        this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
        this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
        window.addEventListener('pointerup', (event) => this.handlePointerUp(event));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoverCell = null;
            if (this.onHover) this.onHover(null);
            this.render();
        });
        this.canvas.addEventListener('click', (event) => {
            const cell = this.getCellFromEvent(event);
            if (cell && this.onCellClick) {
                this.onCellClick(cell);
            }
        });
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.render();
    }

    getCellFromEvent(event) {
        if (!this.model || !this.model.hasData()) return null;
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const cellWidth = rect.width / this.model.cols;
        const cellHeight = rect.height / this.model.rows;
        const col = Math.floor(x / cellWidth);
        const row = Math.floor(y / cellHeight);
        if (row < 0 || col < 0 || row >= this.model.rows || col >= this.model.cols) {
            return null;
        }
        return { row, col };
    }

    handlePointerDown(event) {
        if (!this.model || !this.model.hasData()) return;
        this.isPointerDown = true;
        this.lastPainted.clear();
        this.canvas.setPointerCapture?.(event.pointerId);
        this.paintFromEvent(event);
    }

    handlePointerMove(event) {
        if (!this.model || !this.model.hasData()) return;
        const cell = this.getCellFromEvent(event);
        if (cell) {
            this.hoverCell = cell;
            if (this.onHover) {
                const value = this.model.getValue(cell.row, cell.col);
                const preview = this.model.getPreviewValue(cell.row, cell.col);
                this.onHover({ ...cell, value, preview });
            }
        } else {
            this.hoverCell = null;
            if (this.onHover) this.onHover(null);
        }

        if (this.isPointerDown) {
            this.paintFromEvent(event);
        } else {
            this.render();
        }
    }

    handlePointerUp(event) {
        if (!this.isPointerDown) return;
        this.isPointerDown = false;
        this.canvas.releasePointerCapture?.(event.pointerId);
        this.lastPainted.clear();
    }

    paintFromEvent(event) {
        const cell = this.getCellFromEvent(event);
        if (!cell) return;
        const cellsToPaint = this.collectCells(cell.row, cell.col);
        const key = JSON.stringify(cellsToPaint.map(c => `${c.row}:${c.col}`));
        if (this.lastPainted.has(key)) return;
        this.lastPainted.add(key);
        if (this.onPaint) {
            this.onPaint(cellsToPaint, {
                mode: this.paintMode,
                value: this.brushValue
            });
        }
        this.render();
    }

    collectCells(row, col) {
        const radius = this.brushSize - 1;
        const cells = [];
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr < 0 || nr >= this.model.rows || nc < 0 || nc >= this.model.cols) continue;
                if (Math.abs(dr) + Math.abs(dc) > radius && this.brushSize > 2) continue;
                cells.push({ row: nr, col: nc });
            }
        }
        return cells;
    }

    render() {
        if (!this.ctx) return;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.ctx.clearRect(0, 0, width, height);
        if (!this.model || !this.model.hasData()) {
            return;
        }

        const stats = this.model.computeStats();
        const min = Number.isFinite(stats.min) ? stats.min : 0;
        const max = Number.isFinite(stats.max) ? stats.max : 1;

        const cellWidth = width / this.model.cols;
        const cellHeight = height / this.model.rows;

        for (let row = 0; row < this.model.rows; row++) {
            for (let col = 0; col < this.model.cols; col++) {
                const index = this.model.index(row, col);
                let value = this.model.values[index];
                const mask = this.model.mask[index];
                const preview = this.model.getPreviewValue(row, col);
                let color;

                if (preview) {
                    value = preview.value;
                }

                if (Number.isFinite(value)) {
                    const rgb = this.colorScale.getColor(value, min, max);
                    if (preview) {
                        color = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
                    } else {
                        color = `rgb(${rgb.join(',')})`;
                    }
                } else {
                    color = preview ? 'rgba(34,197,187,0.6)' : 'rgba(30,41,59,0.45)';
                }

                this.ctx.fillStyle = color;
                this.ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth + 1, cellHeight + 1);

                if (this.showImputedOverlay) {
                    if (mask === 1 && !preview) {
                        this.drawMissingIndicator(col, row, cellWidth, cellHeight);
                    } else if (mask === 2) {
                        this.drawImputedIndicator(col, row, cellWidth, cellHeight, preview);
                    } else if (preview) {
                        this.drawPreviewIndicator(col, row, cellWidth, cellHeight);
                    }
                } else if (preview) {
                    this.drawPreviewIndicator(col, row, cellWidth, cellHeight);
                }
            }
        }

        if (this.showGrid) {
            this.drawGrid(cellWidth, cellHeight);
        }

        if (this.hoverCell) {
            this.drawHover(this.hoverCell.col, this.hoverCell.row, cellWidth, cellHeight);
        }
    }

    drawGrid(cellWidth, cellHeight) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        this.ctx.lineWidth = 1;
        for (let col = 0; col <= this.model.cols; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * cellWidth, 0);
            this.ctx.lineTo(col * cellWidth, this.canvas.clientHeight);
            this.ctx.stroke();
        }
        for (let row = 0; row <= this.model.rows; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * cellHeight);
            this.ctx.lineTo(this.canvas.clientWidth, row * cellHeight);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawMissingIndicator(col, row, cellWidth, cellHeight) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(col * cellWidth + 6, row * cellHeight + 6);
        this.ctx.lineTo((col + 1) * cellWidth - 6, (row + 1) * cellHeight - 6);
        this.ctx.moveTo((col + 1) * cellWidth - 6, row * cellHeight + 6);
        this.ctx.lineTo(col * cellWidth + 6, (row + 1) * cellHeight - 6);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawImputedIndicator(col, row, cellWidth, cellHeight, preview) {
        this.ctx.save();
        this.ctx.strokeStyle = preview ? 'rgba(34,197,187,0.9)' : 'rgba(34, 197, 94, 0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(col * cellWidth + 4, row * cellHeight + 4, cellWidth - 8, cellHeight - 8);
        this.ctx.restore();
    }

    drawPreviewIndicator(col, row, cellWidth, cellHeight) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(56,189,248,0.9)';
        this.ctx.setLineDash([6, 4]);
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(col * cellWidth + 3, row * cellHeight + 3, cellWidth - 6, cellHeight - 6);
        this.ctx.restore();
    }

    drawHover(col, row, cellWidth, cellHeight) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(col * cellWidth + 1, row * cellHeight + 1, cellWidth - 2, cellHeight - 2);
        this.ctx.restore();
    }
}

window.HeatmapView = HeatmapView;
