/**
 * Interface principale du Mesh Viewer
 */
class MeshViewerApp {
    constructor() {
        this.model = new MeshModel();
        this.heatmap = null;
        this.renderer = null;
        this.palettes = ColorScale.predefinedPalettes();
        this.preferencesKey = 'lineacnc.meshViewer.preferences';
        this.preferences = this.loadPreferences();
        this.pendingCorrections = null;
        this.autoSave = this.preferences.autoSave ?? true;
        this.init();
    }

    init() {
        this.cacheDom();
        this.initComponents();
        this.renderPaletteList();
        this.applyPreferences();
        this.bindEvents();
        this.updateUiState();
        this.setupCameraWatcher();
    }

    cacheDom() {
        this.elements = {
            heatmapCanvas: document.getElementById('heatmapCanvas'),
            heatmapEmptyState: document.getElementById('heatmapEmptyState'),
            statisticsPanel: document.getElementById('statisticsPanel'),
            statMin: document.getElementById('statMin'),
            statMax: document.getElementById('statMax'),
            statMean: document.getElementById('statMean'),
            statMedian: document.getElementById('statMedian'),
            statStd: document.getElementById('statStd'),
            statImputed: document.getElementById('statImputed'),
            meshDimensions: document.getElementById('meshDimensions'),
            meshMissing: document.getElementById('meshMissing'),
            meshSource: document.getElementById('meshSource'),
            meshCanvas: document.getElementById('meshCanvas'),
            cameraInfo: document.getElementById('cameraInfo'),
            bufferInfo: document.getElementById('bufferInfo'),
            footerStats: document.getElementById('footerStats'),
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            openFileBtn: document.getElementById('openFileBtn'),
            confirmImportBtn: document.getElementById('confirmImportBtn'),
            openPronterfaceBtn: document.getElementById('openPronterfaceBtn'),
            parsePronterfaceBtn: document.getElementById('parsePronterfaceBtn'),
            pronterfaceInput: document.getElementById('pronterfaceInput'),
            pronterfaceTranspose: document.getElementById('pronterfaceTranspose'),
            paintValueInput: document.getElementById('paintValueInput'),
            brushSizeInput: document.getElementById('brushSizeInput'),
            fillMissingBtn: document.getElementById('fillMissingBtn'),
            pickFromSelection: document.getElementById('pickFromSelection'),
            clearPreferencesBtn: document.getElementById('clearPreferencesBtn'),
            toggleAutoSave: document.getElementById('toggleAutoSave'),
            toggleGridBtn: document.getElementById('toggleGridBtn'),
            toggleStatisticsBtn: document.getElementById('toggleStatisticsBtn'),
            toggleImputedOverlay: document.getElementById('toggleImputedOverlay'),
            previewCorrectionBtn: document.getElementById('previewCorrectionBtn'),
            applyCorrectionBtn: document.getElementById('applyCorrectionBtn'),
            cancelCorrectionBtn: document.getElementById('cancelCorrectionBtn'),
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),
            exportCsvBtn: document.getElementById('exportCsvBtn'),
            exportJsonBtn: document.getElementById('exportJsonBtn'),
            modalExportCsv: document.getElementById('modalExportCsv'),
            modalExportJson: document.getElementById('modalExportJson'),
            zScaleInput: document.getElementById('zScaleInput'),
            zScaleValue: document.getElementById('zScaleValue'),
            smoothingInput: document.getElementById('smoothingInput'),
            smoothingValue: document.getElementById('smoothingValue'),
            smoothingKernel: document.getElementById('smoothingKernel'),
            rendererPalette: document.getElementById('rendererPalette'),
            resetCameraBtn: document.getElementById('resetCameraBtn'),
            topCameraBtn: document.getElementById('topCameraBtn'),
            isoCameraBtn: document.getElementById('isoCameraBtn'),
            paletteList: document.getElementById('paletteList'),
            toggleAutoSaveWrapper: document.getElementById('toggleAutoSave'),
            fileImportModal: document.getElementById('fileImportModal'),
            pronterfaceModal: document.getElementById('pronterfaceModal'),
            exportModal: document.getElementById('exportModal')
        };
    }

    initComponents() {
        this.heatmap = new HeatmapView(this.elements.heatmapCanvas, {
            colorScale: this.palettes[0]
        });
        this.heatmap.onPaint = (cells, options) => this.applyPaint(cells, options);
        this.heatmap.onHover = (cell) => this.handleHover(cell);
        this.heatmap.onCellClick = (cell) => this.handleCellClick(cell);

        this.renderer = new MeshRenderer(this.elements.meshCanvas, {
            colorScale: this.palettes[0]
        });
    }

    bindEvents() {
        document.querySelectorAll('[data-collapse-trigger]').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const panel = trigger.closest('section');
                const content = panel.querySelector('[data-collapse-content]');
                content.classList.toggle('hidden');
                trigger.querySelector('svg').classList.toggle('rotate-180');
            });
        });

        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => this.hideModal(button.dataset.target));
        });

        if (this.elements.openFileBtn) {
            this.elements.openFileBtn.addEventListener('click', () => this.showModal('fileImportModal'));
        }

        if (this.elements.confirmImportBtn) {
            this.elements.confirmImportBtn.addEventListener('click', () => {
                this.elements.fileInput.value = '';
                this.elements.fileInput.click();
            });
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (event) => {
                const files = Array.from(event.target.files || []);
                if (files.length) {
                    this.importFiles(files);
                    this.hideModal('fileImportModal');
                }
            });
        }

        if (this.elements.dropZone) {
            const dropZone = this.elements.dropZone;
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    dropZone.classList.add('ring', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
                });
            });
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    dropZone.classList.remove('ring', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
                });
            });
            dropZone.addEventListener('drop', (event) => {
                const files = Array.from(event.dataTransfer.files || []);
                if (files.length) {
                    this.importFiles(files);
                }
            });
        }

        document.addEventListener('paste', (event) => {
            const text = event.clipboardData?.getData('text');
            if (text && this.isMeshLike(text)) {
                try {
                    this.importText(text, { source: 'clipboard' });
                    notificationManager?.show('Maillage importé depuis le presse-papiers', 'success');
                } catch (error) {
                    notificationManager?.show(error.message, 'error');
                }
            }
        });

        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
                event.preventDefault();
                this.showModal('fileImportModal');
            }
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'm') {
                window.location.href = '/tools/mesh-viewer';
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                this.undo();
            }
            if ((event.ctrlKey || event.metaKey) && (event.shiftKey && event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
                event.preventDefault();
                this.redo();
            }
        });

        if (this.elements.openPronterfaceBtn) {
            this.elements.openPronterfaceBtn.addEventListener('click', () => this.showModal('pronterfaceModal'));
        }

        if (this.elements.parsePronterfaceBtn) {
            this.elements.parsePronterfaceBtn.addEventListener('click', () => this.parsePronterface());
        }

        if (this.elements.fillMissingBtn) {
            this.elements.fillMissingBtn.addEventListener('click', () => this.fillMissing());
        }

        if (this.elements.pickFromSelection) {
            this.elements.pickFromSelection.addEventListener('click', () => this.pickSelection());
        }

        if (this.elements.paintValueInput) {
            this.elements.paintValueInput.addEventListener('input', (event) => {
                const value = Number(event.target.value.replace(',', '.'));
                if (Number.isFinite(value)) {
                    this.heatmap.setPaintOptions({ value });
                    if (this.autoSave) this.savePreferences();
                }
            });
        }

        document.querySelectorAll('input.paint-mode').forEach(input => {
            input.addEventListener('change', () => {
                if (input.checked) {
                    this.heatmap.setPaintOptions({ mode: input.value });
                    if (this.autoSave) this.savePreferences();
                }
            });
        });

        if (this.elements.brushSizeInput) {
            this.elements.brushSizeInput.addEventListener('input', (event) => {
                const size = Number(event.target.value);
                this.heatmap.setPaintOptions({ size });
                if (this.autoSave) this.savePreferences();
            });
        }

        if (this.elements.previewCorrectionBtn) {
            this.elements.previewCorrectionBtn.addEventListener('click', () => this.previewCorrections());
        }

        if (this.elements.applyCorrectionBtn) {
            this.elements.applyCorrectionBtn.addEventListener('click', () => this.applyCorrections());
        }

        if (this.elements.cancelCorrectionBtn) {
            this.elements.cancelCorrectionBtn.addEventListener('click', () => this.cancelCorrections());
        }

        if (this.elements.undoBtn) {
            this.elements.undoBtn.addEventListener('click', () => this.undo());
        }

        if (this.elements.redoBtn) {
            this.elements.redoBtn.addEventListener('click', () => this.redo());
        }

        if (this.elements.toggleGridBtn) {
            this.elements.toggleGridBtn.addEventListener('click', () => {
                const enabled = this.heatmap.toggleGrid();
                this.elements.toggleGridBtn.classList.toggle('bg-blue-50', enabled);
                if (this.autoSave) this.savePreferences();
            });
        }

        if (this.elements.toggleStatisticsBtn) {
            this.elements.toggleStatisticsBtn.addEventListener('click', () => {
                this.elements.statisticsPanel.classList.toggle('hidden');
                const enabled = !this.elements.statisticsPanel.classList.contains('hidden');
                this.elements.toggleStatisticsBtn.classList.toggle('bg-blue-50', enabled);
                if (this.autoSave) this.savePreferences();
            });
        }

        if (this.elements.toggleImputedOverlay) {
            this.elements.toggleImputedOverlay.addEventListener('change', (event) => {
                this.heatmap.setImputedOverlay(event.target.checked);
                if (this.autoSave) this.savePreferences();
            });
        }

        if (this.elements.exportCsvBtn) {
            this.elements.exportCsvBtn.addEventListener('click', () => this.showModal('exportModal'));
        }
        if (this.elements.exportJsonBtn) {
            this.elements.exportJsonBtn.addEventListener('click', () => this.showModal('exportModal'));
        }
        if (this.elements.modalExportCsv) {
            this.elements.modalExportCsv.addEventListener('click', () => this.exportMesh('csv'));
        }
        if (this.elements.modalExportJson) {
            this.elements.modalExportJson.addEventListener('click', () => this.exportMesh('json'));
        }

        if (this.elements.zScaleInput) {
            this.elements.zScaleInput.addEventListener('input', (event) => {
                const value = Number(event.target.value);
                this.renderer.setZScale(value);
                this.elements.zScaleValue.textContent = `${value.toFixed(1)}x`;
                if (this.autoSave) this.savePreferences();
                this.updateFooterStats();
            });
        }

        if (this.elements.smoothingInput) {
            this.elements.smoothingInput.addEventListener('input', (event) => {
                const value = Number(event.target.value);
                this.renderer.setSmoothing(value);
                this.elements.smoothingValue.textContent = value.toString();
                if (this.autoSave) this.savePreferences();
            });
        }

        if (this.elements.smoothingKernel) {
            this.elements.smoothingKernel.addEventListener('change', (event) => {
                this.renderer.setSmoothingKernel(event.target.value);
                if (this.autoSave) this.savePreferences();
            });
        }

        if (this.elements.rendererPalette) {
            this.elements.rendererPalette.addEventListener('change', (event) => {
                this.renderer.setRendererPalette(event.target.value);
                if (this.autoSave) this.savePreferences();
            });
        }

        if (this.elements.resetCameraBtn) {
            this.elements.resetCameraBtn.addEventListener('click', () => this.renderer.resetCamera());
        }
        if (this.elements.topCameraBtn) {
            this.elements.topCameraBtn.addEventListener('click', () => this.renderer.topCamera());
        }
        if (this.elements.isoCameraBtn) {
            this.elements.isoCameraBtn.addEventListener('click', () => this.renderer.isoCamera());
        }

        if (this.elements.clearPreferencesBtn) {
            this.elements.clearPreferencesBtn.addEventListener('click', () => this.clearPreferences());
        }

        if (this.elements.toggleAutoSave) {
            this.elements.toggleAutoSave.checked = this.autoSave;
            this.elements.toggleAutoSave.addEventListener('change', (event) => {
                this.autoSave = event.target.checked;
                this.savePreferences();
            });
        }
    }

    setupCameraWatcher() {
        if (!this.renderer) return;
        const update = () => {
            if (this.renderer) {
                const info = this.renderer.getCameraInfo();
                if (this.elements.cameraInfo) {
                    this.elements.cameraInfo.textContent = `Distance: ${info.distance.toFixed(2)} • Azimut: ${(info.azimuth * 180 / Math.PI).toFixed(1)}° • Élévation: ${(info.elevation * 180 / Math.PI).toFixed(1)}°`;
                }
                if (this.elements.bufferInfo) {
                    this.elements.bufferInfo.innerHTML = `<li>Vertices: ${this.renderer.stats.vertices}</li><li>Triangles: ${this.renderer.stats.triangles}</li>`;
                }
            }
            requestAnimationFrame(update);
        };
        update();
    }

    loadPreferences() {
        try {
            const stored = localStorage.getItem(this.preferencesKey);
            if (!stored) return {};
            return JSON.parse(stored);
        } catch (error) {
            console.warn('Impossible de charger les préférences Mesh Viewer:', error);
            return {};
        }
    }

    savePreferences() {
        try {
            const paletteActive = this.palettes[this.activePaletteIndex]?.name || 'viridis';
            const preferences = {
                palette: paletteActive,
                grid: this.heatmap?.showGrid ?? true,
                showStats: !this.elements.statisticsPanel?.classList.contains('hidden'),
                showImputed: this.elements.toggleImputedOverlay?.checked ?? true,
                brushValue: Number(this.elements.paintValueInput?.value || 0),
                brushSize: Number(this.elements.brushSizeInput?.value || 1),
                paintMode: document.querySelector('input.paint-mode:checked')?.value || 'paint',
                zScale: Number(this.elements.zScaleInput?.value || 1),
                smoothing: Number(this.elements.smoothingInput?.value || 0),
                smoothingKernel: this.elements.smoothingKernel?.value || 'gaussian',
                rendererPalette: this.elements.rendererPalette?.value || 'sync',
                autoSave: this.autoSave
            };
            localStorage.setItem(this.preferencesKey, JSON.stringify(preferences));
        } catch (error) {
            console.warn('Impossible de sauvegarder les préférences Mesh Viewer:', error);
        }
    }

    applyPreferences() {
        const prefs = this.preferences;
        if (prefs.brushValue !== undefined && this.elements.paintValueInput) {
            this.elements.paintValueInput.value = prefs.brushValue;
            this.heatmap.setPaintOptions({ value: Number(prefs.brushValue) });
        }
        if (prefs.brushSize && this.elements.brushSizeInput) {
            this.elements.brushSizeInput.value = prefs.brushSize;
            this.heatmap.setPaintOptions({ size: Number(prefs.brushSize) });
        }
        if (prefs.paintMode) {
            const radio = document.querySelector(`input.paint-mode[value="${prefs.paintMode}"]`);
            if (radio) {
                radio.checked = true;
                this.heatmap.setPaintOptions({ mode: prefs.paintMode });
            }
        }
        if (prefs.grid === false) {
            this.heatmap.showGrid = false;
            this.elements.toggleGridBtn?.classList.remove('bg-blue-50');
        }
        if (prefs.showStats === false) {
            this.elements.statisticsPanel?.classList.add('hidden');
            this.elements.toggleStatisticsBtn?.classList.remove('bg-blue-50');
        }
        if (prefs.showImputed === false && this.elements.toggleImputedOverlay) {
            this.elements.toggleImputedOverlay.checked = false;
            this.heatmap.setImputedOverlay(false);
        }
        if (prefs.zScale && this.elements.zScaleInput) {
            this.elements.zScaleInput.value = prefs.zScale;
            this.elements.zScaleValue.textContent = `${Number(prefs.zScale).toFixed(1)}x`;
            this.renderer.setZScale(Number(prefs.zScale));
        }
        if (prefs.smoothing && this.elements.smoothingInput) {
            this.elements.smoothingInput.value = prefs.smoothing;
            this.elements.smoothingValue.textContent = prefs.smoothing.toString();
            this.renderer.setSmoothing(Number(prefs.smoothing));
        }
        if (prefs.smoothingKernel && this.elements.smoothingKernel) {
            this.elements.smoothingKernel.value = prefs.smoothingKernel;
            this.renderer.setSmoothingKernel(prefs.smoothingKernel);
        }
        if (prefs.rendererPalette && this.elements.rendererPalette) {
            this.elements.rendererPalette.value = prefs.rendererPalette;
            this.renderer.setRendererPalette(prefs.rendererPalette);
        }
        if (prefs.palette) {
            const index = this.palettes.findIndex(p => p.name === prefs.palette);
            if (index >= 0) {
                this.setActivePalette(index);
            } else {
                this.setActivePalette(0);
            }
        } else {
            this.setActivePalette(0);
        }
    }

    renderPaletteList() {
        if (!this.elements.paletteList) return;
        this.elements.paletteList.innerHTML = '';
        this.palettes.forEach((palette, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'palette-option';
            button.dataset.index = index;
            const label = document.createElement('span');
            label.textContent = palette.name.charAt(0).toUpperCase() + palette.name.slice(1);
            label.className = 'text-xs font-medium text-gray-700 dark:text-gray-200';
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch';
            palette.getPreviewStops().forEach(color => {
                const span = document.createElement('span');
                span.style.backgroundColor = color;
                swatch.appendChild(span);
            });
            button.appendChild(swatch);
            button.appendChild(label);
            button.addEventListener('click', () => this.setActivePalette(index));
            this.elements.paletteList.appendChild(button);
        });
    }

    setActivePalette(index) {
        this.activePaletteIndex = index;
        const palette = this.palettes[index];
        if (!palette) return;
        this.heatmap.setColorScale(palette);
        this.renderer.setColorScale(palette);
        Array.from(this.elements.paletteList.children).forEach((child, idx) => {
            child.classList.toggle('active', idx === index);
        });
        if (this.autoSave) this.savePreferences();
        this.updateUiState();
    }

    updateUiState() {
        const hasData = this.model.hasData();
        if (this.elements.heatmapEmptyState) {
            this.elements.heatmapEmptyState.classList.toggle('hidden', hasData);
        }
        [
            this.elements.previewCorrectionBtn,
            this.elements.fillMissingBtn,
            this.elements.exportCsvBtn,
            this.elements.exportJsonBtn,
            this.elements.modalExportCsv,
            this.elements.modalExportJson,
            this.elements.resetCameraBtn,
            this.elements.topCameraBtn,
            this.elements.isoCameraBtn
        ].forEach(element => {
            if (element) element.disabled = !hasData;
        });
        if (this.elements.applyCorrectionBtn) {
            this.elements.applyCorrectionBtn.disabled = !hasData || !this.pendingCorrections;
        }
        if (this.elements.cancelCorrectionBtn) {
            this.elements.cancelCorrectionBtn.disabled = !hasData || !this.pendingCorrections;
        }
        if (!hasData) {
            this.elements.meshDimensions.textContent = '-';
            this.elements.meshMissing.textContent = '-';
            this.elements.meshSource.textContent = '-';
            this.elements.footerStats.textContent = 'Aucune donnée.';
        }
    }

    importFiles(files) {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    this.importText(reader.result, { source: `fichier:${file.name}` });
                    notificationManager?.show(`Fichier "${file.name}" importé`, 'success');
                } catch (error) {
                    console.error('Erreur import fichier:', error);
                    notificationManager?.show(error.message, 'error');
                }
            };
            reader.onerror = () => notificationManager?.show('Erreur de lecture du fichier', 'error');
            reader.readAsText(file);
        });
    }

    importText(text, options = {}) {
        const parsed = MeshParsers.parse(text, options);
        this.model.load(parsed.matrix, { mask: parsed.mask, metadata: parsed.metadata });
        this.heatmap.setModel(this.model);
        this.renderer.setModel(this.model);
        this.pendingCorrections = null;
        this.updateAll();
        this.updateMetadata(options.source || parsed.metadata?.source);
        if (this.autoSave) this.savePreferences();
    }

    isMeshLike(text) {
        const lines = text.trim().split(/\r?\n/);
        const sample = lines.slice(0, 5).join('\n');
        return /[0-9\.\-\s,;\|]/.test(sample);
    }

    parsePronterface() {
        const text = this.elements.pronterfaceInput.value.trim();
        if (!text.length) {
            notificationManager?.show('Veuillez coller un rapport Pronterface.', 'warning');
            return;
        }
        try {
            const parsed = MeshParsers.parsePronterface(text, {
                transpose: this.elements.pronterfaceTranspose.checked
            });
            this.model.load(parsed.matrix, { mask: parsed.mask, metadata: parsed.metadata });
            this.heatmap.setModel(this.model);
            this.renderer.setModel(this.model);
            this.pendingCorrections = null;
            this.updateAll();
            this.updateMetadata('pronterface');
            this.hideModal('pronterfaceModal');
            notificationManager?.show('Maillage Pronterface importé avec succès', 'success');
        } catch (error) {
            notificationManager?.show(error.message, 'error');
        }
    }

    applyPaint(cells, options) {
        if (!this.model.hasData()) return;
        if (options.mode === 'paint' && !Number.isFinite(options.value)) return;
        const updates = cells.map(cell => ({
            row: cell.row,
            col: cell.col,
            value: options.mode === 'erase' ? NaN : options.value
        }));
        this.model.bulkUpdate(updates, {
            imputed: options.mode !== 'erase',
            markMissing: options.mode === 'erase'
        });
        this.pendingCorrections = null;
        this.updateAll();
        if (this.autoSave) this.savePreferences();
    }

    handleHover(cell) {
        if (!cell || !this.model.hasData()) return;
        const { row, col, value, preview } = cell;
        const formatted = Number.isFinite(preview?.value || value)
            ? (preview?.value ?? value).toFixed(3)
            : 'NaN';
        this.elements.footerStats.textContent = `Cellule [${row + 1}, ${col + 1}] • Valeur: ${formatted}${preview ? ' (prévisualisation)' : ''}`;
    }

    handleCellClick(cell) {
        if (!this.model.hasData()) return;
        const value = this.model.getValue(cell.row, cell.col);
        if (Number.isFinite(value) && this.elements.paintValueInput) {
            this.elements.paintValueInput.value = value.toFixed(3);
            this.heatmap.setPaintOptions({ value });
        }
    }

    fillMissing() {
        if (!this.model.hasData()) return;
        const value = Number(this.elements.paintValueInput?.value || 0);
        this.model.fillMissing(value);
        notificationManager?.show('Points manquants remplis avec la valeur du pinceau.', 'info');
        this.updateAll();
    }

    pickSelection() {
        if (!this.model.hasData() || !this.heatmap.hoverCell) return;
        const { row, col } = this.heatmap.hoverCell;
        const value = this.model.getValue(row, col);
        if (Number.isFinite(value)) {
            this.elements.paintValueInput.value = value.toFixed(3);
            this.heatmap.setPaintOptions({ value });
        }
    }

    previewCorrections() {
        if (!this.model.hasData()) return;
        const { corrections } = this.model.buildMedianCorrection({ includeImputed: false });
        if (!corrections.length) {
            notificationManager?.show('Aucune correction nécessaire : aucun point manquant détecté.', 'info');
            return;
        }
        this.pendingCorrections = corrections;
        this.model.setPreview(corrections);
        this.heatmap.render();
        this.elements.applyCorrectionBtn.disabled = false;
        this.elements.cancelCorrectionBtn.disabled = false;
        notificationManager?.show(`${corrections.length} corrections disponibles. Vérifiez l'aperçu turquoise.`, 'info');
    }

    applyCorrections() {
        if (!this.pendingCorrections?.length) return;
        this.model.applyCorrections(this.pendingCorrections);
        this.model.clearPreview();
        this.pendingCorrections = null;
        this.updateAll();
        this.elements.applyCorrectionBtn.disabled = true;
        this.elements.cancelCorrectionBtn.disabled = true;
        notificationManager?.show('Corrections appliquées avec succès.', 'success');
    }

    cancelCorrections() {
        if (!this.pendingCorrections) return;
        this.model.clearPreview();
        this.pendingCorrections = null;
        this.heatmap.render();
        this.elements.applyCorrectionBtn.disabled = true;
        this.elements.cancelCorrectionBtn.disabled = true;
        notificationManager?.show('Prévisualisation annulée.', 'info');
    }

    undo() {
        if (this.model.undo()) {
            this.pendingCorrections = null;
            this.updateAll();
        }
    }

    redo() {
        if (this.model.redo()) {
            this.pendingCorrections = null;
            this.updateAll();
        }
    }

    updateAll() {
        this.heatmap.render();
        this.renderer.updateBuffers();
        this.updateStatistics();
        this.updateFooterStats();
        this.updateMetadata();
        this.updateUiState();
    }

    updateStatistics() {
        if (!this.model.hasData()) return;
        const stats = this.model.computeStats();
        this.elements.statMin.textContent = MeshStats.format(stats.min);
        this.elements.statMax.textContent = MeshStats.format(stats.max);
        this.elements.statMean.textContent = MeshStats.format(stats.mean);
        this.elements.statMedian.textContent = MeshStats.format(stats.median);
        this.elements.statStd.textContent = MeshStats.format(stats.std);
        this.elements.statImputed.textContent = `${stats.imputed} / ${stats.missing}`;
    }

    updateFooterStats() {
        if (!this.model.hasData()) return;
        const stats = this.model.computeStats();
        const palette = this.palettes[this.activePaletteIndex]?.name ?? 'viridis';
        this.elements.footerStats.textContent = `Dimensions: ${this.model.rows}×${this.model.cols} • Min: ${MeshStats.format(stats.min)} • Max: ${MeshStats.format(stats.max)} • Palette: ${palette} • Échelle Z: ${Number(this.elements.zScaleInput?.value || 1).toFixed(1)}x`;
    }

    updateMetadata(source) {
        if (!this.model.hasData()) return;
        this.elements.meshDimensions.textContent = `${this.model.rows} × ${this.model.cols}`;
        const stats = this.model.computeStats();
        this.elements.meshMissing.textContent = `${stats.missing} points`;
        if (source) {
            this.model.metadata.source = source;
        }
        this.elements.meshSource.textContent = this.model.metadata.source || 'inconnu';
    }

    showModal(id) {
        const modal = this.elements[id];
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('show', 'flex');
    }

    hideModal(id) {
        const modal = this.elements[id];
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('show', 'flex');
    }

    exportMesh(format) {
        if (!this.model.hasData()) {
            notificationManager?.show('Aucun maillage à exporter.', 'warning');
            return;
        }
        const payload = this.model.toExportPayload();
        this.hideModal('exportModal');
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            this.downloadBlob(blob, `mesh-${Date.now()}.json`);
        } else {
            const lines = [];
            for (let r = 0; r < this.model.rows; r++) {
                const row = [];
                for (let c = 0; c < this.model.cols; c++) {
                    const value = this.model.getValue(r, c);
                    row.push(Number.isFinite(value) ? value.toFixed(5) : 'NaN');
                }
                lines.push(row.join(','));
            }
            const header = `# rows=${this.model.rows}, cols=${this.model.cols}, source=${payload.metadata.source || 'unknown'}`;
            const csv = [header, ...lines].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            this.downloadBlob(blob, `mesh-${Date.now()}.csv`);
        }
        notificationManager?.show('Export généré avec succès.', 'success');
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    clearPreferences() {
        localStorage.removeItem(this.preferencesKey);
        this.preferences = {};
        this.autoSave = true;
        if (this.elements.toggleAutoSave) {
            this.elements.toggleAutoSave.checked = true;
        }
        notificationManager?.show('Préférences Mesh Viewer réinitialisées.', 'success');
    }
}

window.MeshViewerApp = MeshViewerApp;
