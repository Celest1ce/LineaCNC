/**
 * Gestionnaire du Mesh Viewer
 */

class MeshViewer {
    constructor() {
        this.meshData = null;
        this.minValue = null;
        this.maxValue = null;
        this.gradientType = 'viridis'; // Dégradé par défaut
        this.autoImportDone = false;
        this.importTimeout = null;
        this.machineDataBuffer = null;
        this.serialUnsubscribe = null;
        this.currentMeshMachineId = null;
        
        // Variables 3D
        this.scene3D = null;
        this.camera3D = null;
        this.renderer3D = null;
        this.controls3D = null;
        this.mesh3D = null;
        this.gridHelper = null;
        this.axesHelper = null;
        
        // Paramètres 3D
        this.mesh3DPreferencesKey = 'meshViewer3DPreferences';
        this.mesh3DSmoothingLabels = ['Brut', 'Léger', 'Standard', 'Doux', 'Ultra'];
        this.mesh3DSmoothingLevel = 2; // Niveau de lissage par défaut (5 niveaux disponibles)
        this.mesh3DZScale = 1.0; // Amplitude Z par défaut
        this.lastMeshMachineId = null; // Dernière machine utilisée pour le mesh affiché
        this.lastMeshMachineUuid = null; // UUID de la machine utilisée pour le dernier mesh
        this.pointRefreshState = null; // État du rafraîchissement d'un point individuel
        this.meshDataVersion = 0;
        this.mesh3DRenderCache = null;
        this.pendingRender3D = false;
        this.animationId = null;
        this.is3DInteracting = false;

        this.loadMesh3DPreferences();
        this.init();
    }
    
    init() {
        const openImportModal = document.getElementById('openImportModal');
        const importButton = document.getElementById('importButton');
        const closeImportModal = document.getElementById('closeImportModal');
        const cancelImport = document.getElementById('cancelImport');
        const importModal = document.getElementById('importModal');
        const meshImport = document.getElementById('meshImport');
        
        // Ouvrir le modal
        if (openImportModal) {
            openImportModal.addEventListener('click', () => this.openImportModal());
        }
        
        // Fermer le modal
        if (closeImportModal) {
            closeImportModal.addEventListener('click', () => this.closeImportModal());
        }
        
        if (cancelImport) {
            cancelImport.addEventListener('click', () => this.closeImportModal());
        }
        
        // Fermer en cliquant sur le fond
        if (importModal) {
            importModal.addEventListener('click', (e) => {
                if (e.target === importModal) {
                    this.closeImportModal();
                }
            });
        }
        
        // Importer les données
        if (importButton) {
            importButton.addEventListener('click', () => this.importMesh());
        }
        
        // Fermer avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && importModal && !importModal.classList.contains('hidden')) {
                this.closeImportModal();
            }
            if (e.key === 'Escape') {
                const mesh3DSettingsModal = document.getElementById('mesh3DSettingsModal');
                if (mesh3DSettingsModal && !mesh3DSettingsModal.classList.contains('hidden')) {
                    this.closeMesh3DSettings();
                }
            }
        });
        
        // Paramètres vue 3D
        const mesh3DSettingsBtn = document.getElementById('mesh3DSettingsBtn');
        const mesh3DSettingsModal = document.getElementById('mesh3DSettingsModal');
        const closeMesh3DSettingsModal = document.getElementById('closeMesh3DSettingsModal');
        const applyMesh3DSettings = document.getElementById('applyMesh3DSettings');
        const mesh3DSmoothingLevel = document.getElementById('mesh3DSmoothingLevel');
        const mesh3DSmoothingValue = document.getElementById('mesh3DSmoothingValue');
        const mesh3DZScale = document.getElementById('mesh3DZScale');
        const mesh3DZScaleValue = document.getElementById('mesh3DZScaleValue');
        
        if (mesh3DSettingsBtn && mesh3DSettingsModal) {
            mesh3DSettingsBtn.addEventListener('click', () => this.openMesh3DSettings());
        }
        
        if (closeMesh3DSettingsModal) {
            closeMesh3DSettingsModal.addEventListener('click', () => this.closeMesh3DSettings());
        }
        
        if (mesh3DSettingsModal) {
            mesh3DSettingsModal.addEventListener('click', (e) => {
                if (e.target === mesh3DSettingsModal) {
                    this.closeMesh3DSettings();
                }
            });
        }
        
        if (applyMesh3DSettings) {
            applyMesh3DSettings.addEventListener('click', () => this.applyMesh3DSettings());
        }
        
        if (mesh3DSmoothingLevel && mesh3DSmoothingValue) {
            mesh3DSmoothingLevel.value = String(this.mesh3DSmoothingLevel);
            mesh3DSmoothingValue.textContent = this.getMeshSmoothingLabel(this.mesh3DSmoothingLevel);
            mesh3DSmoothingLevel.addEventListener('input', (e) => {
                const level = parseInt(e.target.value, 10);
                if (!Number.isNaN(level)) {
                    mesh3DSmoothingValue.textContent = this.getMeshSmoothingLabel(level);
                }
            });
        }

        if (mesh3DZScale && mesh3DZScaleValue) {
            mesh3DZScale.value = this.mesh3DZScale;
            mesh3DZScaleValue.textContent = this.mesh3DZScale.toFixed(1);
            mesh3DZScale.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!Number.isNaN(value)) {
                    mesh3DZScaleValue.textContent = value.toFixed(1);
                }
            });
        }
        
        // Gérer le changement de dégradé
        const gradientType = document.getElementById('gradientType');
        if (gradientType) {
            gradientType.value = this.gradientType; // Initialiser avec viridis
            gradientType.addEventListener('change', (e) => {
                this.gradientType = e.target.value;
                // Mettre à jour la vue 3D si elle existe
                if (this.meshData) {
                    this.render3D(this.meshData);
                }
                const customOptions = document.getElementById('customGradientOptions');
                if (customOptions) {
                    customOptions.classList.toggle('hidden', this.gradientType !== 'custom');
                }
                if (this.meshData) {
                    // Recalculer les statistiques et mettre à jour les couleurs
                    const stats = this.calculateStats(this.meshData.matrix);
                    this.updateMatrixColors(stats.min, stats.max);
                    this.updateLegend(stats.min, stats.max);
                }
            });
        }
        
        // Gérer les couleurs personnalisées
        const customColorNegative = document.getElementById('customColorNegative');
        const customColorNegativeHex = document.getElementById('customColorNegativeHex');
        const customColorPositive = document.getElementById('customColorPositive');
        const customColorPositiveHex = document.getElementById('customColorPositiveHex');
        
        if (customColorNegative && customColorNegativeHex) {
            customColorNegative.addEventListener('input', (e) => {
                customColorNegativeHex.value = e.target.value;
                if (this.gradientType === 'custom' && this.meshData) {
                    const stats = this.calculateStats(this.meshData.matrix);
                    this.updateMatrixColors(stats.min, stats.max);
                    this.updateLegend(stats.min, stats.max);
                }
            });
            customColorNegativeHex.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    customColorNegative.value = e.target.value;
                    if (this.gradientType === 'custom' && this.meshData) {
                        const stats = this.calculateStats(this.meshData.matrix);
                        this.updateMatrixColors(stats.min, stats.max);
                        this.updateLegend(stats.min, stats.max);
                    }
                }
            });
        }
        
        if (customColorPositive && customColorPositiveHex) {
            customColorPositive.addEventListener('input', (e) => {
                customColorPositiveHex.value = e.target.value;
                if (this.gradientType === 'custom' && this.meshData) {
                    const stats = this.calculateStats(this.meshData.matrix);
                    this.updateMatrixColors(stats.min, stats.max);
                    this.updateLegend(stats.min, stats.max);
                }
            });
            customColorPositiveHex.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    customColorPositive.value = e.target.value;
                    if (this.gradientType === 'custom' && this.meshData) {
                        const stats = this.calculateStats(this.meshData.matrix);
                        this.updateMatrixColors(stats.min, stats.max);
                        this.updateLegend(stats.min, stats.max);
                    }
                }
            });
        }

        // Injecter l'onglet Correction automatique des données manquantes (UI)
        this.injectAutoCorrectionUI();

        // Mettre à jour les actions dépendantes du mesh au chargement
        this.updateAutoCorrectionAvailability();

        // Détecter les changements dans le textarea pour afficher les infos
        if (meshImport) {
            meshImport.addEventListener('input', () => {
                this.detectMeshInfo();
            });
            meshImport.addEventListener('paste', () => {
                setTimeout(() => this.detectMeshInfo(), 50);
            });
        }
        
        // Gérer l'import depuis la machine
        const importFromMachine = document.getElementById('importFromMachine');
        if (importFromMachine) {
            importFromMachine.addEventListener('click', () => this.showMachineSelection());
        }
        
        // Gérer la fermeture du modal de sélection de machine
        const closeMachineSelectModal = document.getElementById('closeMachineSelectModal');
        const machineSelectModal = document.getElementById('machineSelectModal');
        if (closeMachineSelectModal) {
            closeMachineSelectModal.addEventListener('click', () => this.closeMachineSelection());
        }
        if (machineSelectModal) {
            machineSelectModal.addEventListener('click', (e) => {
                if (e.target === machineSelectModal) {
                    this.closeMachineSelection();
                }
            });
        }
        
    }
    
    notify(message, type = 'info') {
        if (!message) {
            return;
        }

        if (typeof notificationManager !== 'undefined' && typeof notificationManager.show === 'function') {
            notificationManager.show(message, type);
        } else {
            const logMethod = type === 'error' ? console.error : console.log;
            logMethod(`[MeshViewer] ${message}`);
        }
    }

    setAutoCorrectionMessage(message, type = 'info') {
        const info = document.getElementById('autoCorrectionInfo');
        if (!info) {
            return;
        }

        info.classList.remove(
            'text-gray-500',
            'dark:text-gray-400',
            'text-red-600',
            'dark:text-red-400',
            'text-green-600',
            'dark:text-green-400'
        );

        delete info.dataset.messageType;

        if (!message) {
            info.textContent = '';
            info.classList.add('hidden', 'text-gray-500', 'dark:text-gray-400');
            return;
        }

        if (type === 'error') {
            info.classList.add('text-red-600', 'dark:text-red-400');
        } else if (type === 'success') {
            info.classList.add('text-green-600', 'dark:text-green-400');
        } else {
            info.classList.add('text-gray-500', 'dark:text-gray-400');
        }

        info.textContent = message;
        info.classList.remove('hidden');
        info.dataset.messageType = type;
    }

    updateAutoCorrectionAvailability() {
        const button = document.getElementById('applyAutoCorrection');
        const hasMesh = Boolean(this.meshData && this.meshData.matrix && this.meshData.matrix.length);

        if (button) {
            button.disabled = !hasMesh;
            if (hasMesh) {
                button.removeAttribute('aria-disabled');
            } else {
                button.setAttribute('aria-disabled', 'true');
            }
        }

        const info = document.getElementById('autoCorrectionInfo');

        if (!hasMesh) {
            this.setAutoCorrectionMessage('Importez un mesh pour activer la correction automatique.', 'info');
        } else if (info && info.dataset.messageType !== 'error' && info.dataset.messageType !== 'success') {
            this.setAutoCorrectionMessage('', 'info');
        }
    }

    /**
     * Ouvre le modal d'import
     */
    openImportModal() {
        const importModal = document.getElementById('importModal');
        const meshImport = document.getElementById('meshImport');
        if (importModal) {
            importModal.classList.remove('hidden');
            // Focus sur le textarea après un court délai pour l'animation
            setTimeout(() => {
                if (meshImport) {
                    meshImport.focus();
                }
            }, 100);
        }
    }

    /**
     * Insère un petit bloc UI pour la correction automatique des données manquantes
     * (injecté près des contrôles de dégradé à gauche)
     */
    injectAutoCorrectionUI() {
        try {
            if (document.getElementById('autoCorrectionBlock')) return;

            const anchor = document.getElementById('gradientType') || document.getElementById('heatmapLegend') || document.getElementById('meshContainer');
            if (!anchor || !anchor.parentElement) return;

        const block = document.createElement('div');
        block.id = 'autoCorrectionBlock';
        block.className = 'mt-6 rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/90';
        block.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow dark:from-blue-400 dark:to-indigo-500">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="flex-1 space-y-3">
                    <div class="flex items-center justify-between gap-2">
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Correction des valeurs manquantes</p>
                        <span class="machine-status-badge bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                            <span class="machine-status-dot bg-blue-500/70"></span>
                            Intelligent
                        </span>
                    </div>
                    <p class="text-xs leading-relaxed text-gray-600 dark:text-gray-300">L&rsquo;algorithme ajuste un plan virtuel à partir des points valides afin de combler uniquement les cases vides sans altérer vos mesures existantes.</p>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            id="applyAutoCorrection"
                            type="button"
                            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
                        >
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Corriger les valeurs
                        </button>
                        <div id="autoCorrectionInfo" class="hidden text-xs text-gray-500 dark:text-gray-400 sm:flex-1"></div>
                    </div>
                </div>
            </div>
        `;

        const btn = block.querySelector('#applyAutoCorrection');
        if (btn) {
            btn.addEventListener('click', () => this.autoFillMissingWithPlane());
        }

        const info = block.querySelector('#autoCorrectionInfo');
        if (info) {
            info.dataset.messageType = 'info';
        }

        if (anchor.nextSibling) {
            anchor.parentElement.insertBefore(block, anchor.nextSibling);
        } else {
            anchor.parentElement.appendChild(block);
        }

        this.updateAutoCorrectionAvailability();
    } catch (e) {
        // Silencieux si l'UI n'existe pas sur cette page
    }
}

    /**
     * Remplit uniquement les valeurs manquantes par ajustement plan (moindres carrés)
     */
    autoFillMissingWithPlane() {
        if (!this.meshData || !this.meshData.matrix) {
            const message = 'Aucun mesh chargé. Importez des données d\'abord.';
            this.notify(message, 'error');
            this.setAutoCorrectionMessage(message, 'error');
            return;
        }

        const matrix = this.meshData.matrix;
        const rows = this.meshData.rows;
        const cols = this.meshData.cols;

        // Construire A (x, y, 1) et z pour les points existants
        const xs = [];
        const ys = [];
        const zs = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const v = matrix[i][j];
                if (v !== null && !isNaN(v)) {
                    xs.push(j);
                    ys.push(i);
                    zs.push(v);
                }
            }
        }

        if (zs.length < 3) {
            const message = 'Pas assez de points pour ajuster un plan.';
            this.notify(message, 'error');
            this.setAutoCorrectionMessage(message, 'error');
            return;
        }

        // Centrer pour stabilité numérique
        const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        const mx = mean(xs);
        const my = mean(ys);
        const mz = mean(zs);

        let Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0;
        for (let k = 0; k < zs.length; k++) {
            const cx = xs[k] - mx;
            const cy = ys[k] - my;
            const cz = zs[k] - mz;
            Sxx += cx * cx;
            Syy += cy * cy;
            Sxy += cx * cy;
            Sxz += cx * cz;
            Syz += cy * cz;
        }

        // Résoudre pour a, b dans z - mz = a(x-mx) + b(y-my)
        const det = Sxx * Syy - Sxy * Sxy;
        let a = 0, b = 0;
        if (Math.abs(det) > 1e-12) {
            a = (Sxz * Syy - Sxy * Syz) / det;
            b = (Sxx * Syz - Sxy * Sxz) / det;
        } else {
            // Cas dégénéré: utiliser régression unidimensionnelle selon l'axe le plus variant
            if (Sxx > Syy && Sxx > 1e-12) {
                a = Sxz / Sxx;
                b = 0;
            } else if (Syy > 1e-12) {
                a = 0;
                b = Syz / Syy;
            } else {
                a = 0; b = 0;
            }
        }
        const c = mz - a * mx - b * my;

        // Remplir uniquement les valeurs manquantes
        const filledCells = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (matrix[i][j] === null || matrix[i][j] === undefined) {
                    const z = a * j + b * i + c;
                    if (Number.isFinite(z)) {
                        const roundedValue = parseFloat(z.toFixed(3));
                        matrix[i][j] = roundedValue;
                        filledCells.push({ row: i, col: j, value: roundedValue });
                    }
                }
            }
        }

        if (filledCells.length === 0) {
            this.setAutoCorrectionMessage('Aucune valeur manquante à corriger.', 'info');
            return;
        }

        this.markMeshDataDirty();

        // Mettre à jour l'affichage (stats, couleurs, légende, 3D)
        const stats = this.calculateStats(matrix);
        this.minValue = stats.min;
        this.maxValue = stats.max;

        filledCells.forEach(({ row, col, value }) => {
            const cell = document.querySelector(`.mesh-cell.editable[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.dataset.value = value;
            }
        });

        this.meshData.missingCount = rows * cols - stats.count;
        this.meshData.totalValues = stats.count;
        this.updateMatrixColors(stats.min, stats.max);
        this.updateStats(stats, rows, cols);
        this.updateLegend(stats.min, stats.max);

        const successMessage = `${filledCells.length} case(s) manquante(s) corrigée(s) par ajustement plan.`;
        this.setAutoCorrectionMessage(successMessage, 'success');
        this.notify(successMessage, 'success');
        this.updateAutoCorrectionAvailability();
    }
    
    /**
     * Ferme le modal d'import
     */
    closeImportModal() {
        const importModal = document.getElementById('importModal');
        const meshImport = document.getElementById('meshImport');
        if (importModal) {
            importModal.classList.add('hidden');
            if (meshImport) {
                meshImport.value = '';
            }
        }
    }
    
    /**
     * Parse le format d'import mesh
     */
    parseMeshData(text) {
        if (!text || text.trim() === '') {
            return null;
        }

        const sanitized = text.replace(/\r/g, '\n');
        const lines = sanitized.trim().split('\n');
        const dataLines = [];
        const coordinateLines = [];
        const columnHeaderCandidates = [];

        for (let i = 0; i < lines.length; i++) {
            const rawLine = typeof lines[i] === 'string' ? lines[i] : '';
            let line = rawLine.trim();

            if (!line) {
                continue;
            }

            const lowerLine = line.toLowerCase();

            if (lowerLine.includes('bed topography') || lowerLine.includes('report')) {
                continue;
            }

            const coordinateMatches = [...line.matchAll(/\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/g)];
            if (coordinateMatches.length > 0 && !line.includes('|')) {
                const parsedPairs = coordinateMatches
                    .map((match) => {
                        const x = parseFloat(match[1]);
                        const y = parseFloat(match[2]);
                        return {
                            x: Number.isNaN(x) ? null : x,
                            y: Number.isNaN(y) ? null : y
                        };
                    })
                    .filter((pair) => pair.x !== null || pair.y !== null);

                if (parsedPairs.length > 0) {
                    coordinateLines.push(parsedPairs);
                }
                continue;
            }

            if (lowerLine === 'ok' || line.startsWith('>')) {
                continue;
            }

            if (!line.includes('|')) {
                const numericTokens = line.match(/[+-]?\d+(?:\.\d+)?/g);
                if (numericTokens && numericTokens.length >= 2) {
                    const parsedNumbers = numericTokens
                        .map((token) => {
                            const parsed = parseFloat(token);
                            return Number.isNaN(parsed) ? null : parsed;
                        })
                        .filter((value) => value !== null);

                    if (parsedNumbers.length >= 2) {
                        columnHeaderCandidates.push(parsedNumbers);
                        continue;
                    }
                }
            }

            if (line === '|') {
                continue;
            }

            if (line.includes('|')) {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const rowLabel = parts[0];
                    const rowNumberMatch = rowLabel.match(/([+-]?\d+(?:\.\d+)?)(?!.*[+-]?\d)/);
                    if (!rowNumberMatch) {
                        continue;
                    }

                    const parsedRowPosition = parseFloat(rowNumberMatch[1]);
                    const rowPosition = Number.isNaN(parsedRowPosition) ? null : parsedRowPosition;
                    const sortKeyCandidate = Number.isFinite(rowPosition)
                        ? rowPosition
                        : parseInt(rowNumberMatch[1], 10);
                    const rowSortKey = Number.isNaN(sortKeyCandidate) ? null : sortKeyCandidate;
                    const originalIndex = dataLines.length;

                    let valuesStr = parts.slice(1).join('|').trim();
                    valuesStr = valuesStr.replace(/\|\s*$/, '').trim();

                    const normalizedStr = valuesStr.replace(/\s+/g, ' ');
                    const values = [];
                    const valuePattern = /(\[\s*\.?\s*\]|[+-]?\d+\.?\d*|\.)/g;
                    let match;

                    while ((match = valuePattern.exec(normalizedStr)) !== null) {
                        let token = match[1].trim();

                        if (token === '.' || token === '[.]' || token === '[ .]' || /^\[\s*\.\s*\]$/.test(token)) {
                            values.push(null);
                            continue;
                        }

                        token = token.replace(/[\[\]]/g, '').trim();

                        if (token === '.' || token === '') {
                            values.push(null);
                            continue;
                        }

                        let numMatch = token.match(/^([+-]?)(\d+)(\.\d+)?/);
                        if (!numMatch) {
                            numMatch = token.match(/([+-]?\d+\.?\d*)/);
                        }

                        if (numMatch) {
                            let numStr = numMatch[0];

                            if (/^[+-]?\d{4,}$/.test(numStr) && !numStr.includes('.')) {
                                const sign = numStr.startsWith('-') ? '-' : (numStr.startsWith('+') ? '+' : '');
                                const digits = numStr.replace(/^[+-]/, '');
                                if (digits.length >= 3) {
                                    numStr = `${sign}${digits.slice(0, 1)}.${digits.slice(1, 3)}`;
                                }
                            }

                            const parsedValue = parseFloat(numStr);
                            values.push(Number.isNaN(parsedValue) ? null : parsedValue);
                        } else {
                            values.push(null);
                        }
                    }

                    if (values.length > 0) {
                        dataLines.push({
                            rowPosition,
                            rowSortKey,
                            originalIndex,
                            values
                        });
                    }
                }
            }
        }

        if (dataLines.length === 0) {
            return null;
        }

        dataLines.sort((a, b) => {
            const aKey = Number.isFinite(a.rowSortKey) ? a.rowSortKey : null;
            const bKey = Number.isFinite(b.rowSortKey) ? b.rowSortKey : null;

            if (aKey !== null && bKey !== null) {
                if (aKey === bKey) {
                    return a.originalIndex - b.originalIndex;
                }
                return bKey - aKey;
            }

            if (aKey !== null) {
                return -1;
            }

            if (bKey !== null) {
                return 1;
            }

            return a.originalIndex - b.originalIndex;
        });

        const numRows = dataLines.length;

        const colCounts = dataLines.map((line) => line.values.length);
        const colCountMap = {};
        colCounts.forEach((count) => {
            colCountMap[count] = (colCountMap[count] || 0) + 1;
        });

        let numCols = Math.max(...colCounts);
        let maxFreq = 0;
        for (const [count, freq] of Object.entries(colCountMap)) {
            if (freq > maxFreq) {
                maxFreq = freq;
                numCols = parseInt(count, 10);
            }
        }

        console.log('Détection de la taille:', {
            rows: numRows,
            cols: numCols,
            colCounts,
            colCountMap
        });

        const matrix = [];
        let missingCount = 0;
        let totalValues = 0;

        for (let i = 0; i < numRows; i++) {
            matrix.push([]);
            const rowData = dataLines[i];
            for (let j = 0; j < numCols; j++) {
                if (rowData.values[j] !== undefined && rowData.values[j] !== null) {
                    matrix[i].push(rowData.values[j]);
                    totalValues++;
                } else {
                    matrix[i].push(null);
                    missingCount++;
                }
            }
        }

        const xSamples = [];
        const ySamples = [];
        coordinateLines.forEach((pairs) => {
            pairs.forEach((pair) => {
                if (pair.x !== null) {
                    xSamples.push(pair.x);
                }
                if (pair.y !== null) {
                    ySamples.push(pair.y);
                }
            });
        });

        const xRange = xSamples.length > 0
            ? { min: Math.min(...xSamples), max: Math.max(...xSamples) }
            : null;
        const yRange = ySamples.length > 0
            ? { min: Math.min(...ySamples), max: Math.max(...ySamples) }
            : null;

        let xCoordinates = null;
        if (coordinateLines.length > 0) {
            const bestPairs = coordinateLines.reduce((best, pairs) => {
                const bestValid = Array.isArray(best)
                    ? best.filter((pair) => pair.x !== null).length
                    : 0;
                const currentValid = pairs.filter((pair) => pair.x !== null).length;
                return currentValid > bestValid ? pairs : best;
            }, null);

            if (bestPairs && Array.isArray(bestPairs)) {
                const sortedPairs = bestPairs
                    .filter((pair) => pair.x !== null)
                    .sort((a, b) => a.x - b.x);
                if (sortedPairs.length >= numCols) {
                    xCoordinates = sortedPairs.slice(0, numCols).map((pair) => pair.x);
                } else if (sortedPairs.length === numCols) {
                    xCoordinates = sortedPairs.map((pair) => pair.x);
                }
            }
        }

        if ((!xCoordinates || xCoordinates.length !== numCols) && columnHeaderCandidates.length > 0) {
            const bestCandidate = columnHeaderCandidates.reduce((best, candidate) => (
                candidate.length > (Array.isArray(best) ? best.length : 0) ? candidate : best
            ), null);

            if (bestCandidate && bestCandidate.length >= numCols) {
                xCoordinates = bestCandidate.slice(0, numCols);
            }
        }

        if ((!xCoordinates || xCoordinates.length !== numCols) && xRange && Number.isFinite(xRange.min) && Number.isFinite(xRange.max)) {
            xCoordinates = [];
            if (numCols <= 1 || xRange.max === xRange.min) {
                for (let col = 0; col < numCols; col++) {
                    xCoordinates.push(xRange.min);
                }
            } else {
                const step = (xRange.max - xRange.min) / (numCols - 1);
                for (let col = 0; col < numCols; col++) {
                    xCoordinates.push(xRange.min + (step * col));
                }
            }
        }

        if (Array.isArray(xCoordinates)) {
            xCoordinates = xCoordinates.map((value) => {
                if (Number.isFinite(value)) {
                    return value;
                }
                if (typeof value === 'string') {
                    const parsed = parseFloat(value);
                    return Number.isNaN(parsed) ? null : parsed;
                }
                return null;
            });

            if (xCoordinates.some((value) => !Number.isFinite(value))) {
                xCoordinates = null;
            }
        }

        let yCoordinates = dataLines.map((line) => {
            if (Number.isFinite(line.rowPosition)) {
                return line.rowPosition;
            }
            if (typeof line.rowPosition === 'string') {
                const parsed = parseFloat(line.rowPosition);
                if (!Number.isNaN(parsed)) {
                    return parsed;
                }
            }
            return null;
        });

        const yNeedsInterpolation = yCoordinates.every((value) => value === null);
        if ((yNeedsInterpolation || yCoordinates.some((value) => value === null)) && yRange && Number.isFinite(yRange.min) && Number.isFinite(yRange.max)) {
            const max = yRange.max;
            const min = yRange.min;
            if (numRows <= 1 || max === min) {
                yCoordinates = new Array(numRows).fill(max);
            } else {
                const step = (max - min) / (numRows - 1);
                yCoordinates = yCoordinates.map((value, index) => {
                    if (Number.isFinite(value)) {
                        return value;
                    }
                    return max - (step * index);
                });
            }
        }

        if (Array.isArray(yCoordinates)) {
            yCoordinates = yCoordinates.map((value) => {
                if (Number.isFinite(value)) {
                    return value;
                }
                if (typeof value === 'string') {
                    const parsed = parseFloat(value);
                    return Number.isNaN(parsed) ? null : parsed;
                }
                return null;
            });

            if (yCoordinates.every((value) => value === null)) {
                yCoordinates = null;
            }
        }

        return {
            matrix,
            rows: numRows,
            cols: numCols,
            missingCount,
            totalValues,
            xCoordinates: Array.isArray(xCoordinates) ? xCoordinates : null,
            yCoordinates: Array.isArray(yCoordinates) ? yCoordinates : null,
            xRange,
            yRange
        };
    }

    /**
     * Détecte les informations du mesh dans le textarea
     */
    detectMeshInfo() {
        const textarea = document.getElementById('meshImport');
        const importInfo = document.getElementById('importInfo');
        const detectedSize = document.getElementById('detectedSize');
        const detectedCount = document.getElementById('detectedCount');
        const detectedMissing = document.getElementById('detectedMissing');
        
        if (!textarea || !importInfo) return;
        
        const text = textarea.value.trim();
        if (!text) {
            importInfo.classList.add('hidden');
            return;
        }
        
        const meshData = this.parseMeshData(text);
        if (!meshData) {
            importInfo.classList.add('hidden');
            return;
        }
        
        // Afficher les informations
        if (detectedSize) {
            detectedSize.textContent = `${meshData.rows}x${meshData.cols}`;
        }
        if (detectedCount) {
            detectedCount.textContent = meshData.totalValues || (meshData.rows * meshData.cols);
        }
        if (detectedMissing) {
            detectedMissing.textContent = meshData.missingCount || 0;
        }
        importInfo.classList.remove('hidden');
    }
    
    /**
     * Calcule les statistiques de la matrice
     */
    calculateStats(matrix) {
        let min = Infinity;
        let max = -Infinity;
        let count = 0;
        
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                const value = matrix[i][j];
                if (value !== null && !isNaN(value)) {
                    min = Math.min(min, value);
                    max = Math.max(max, value);
                    count++;
                }
            }
        }
        
        return {
            min: min === Infinity ? 0 : min,
            max: max === -Infinity ? 0 : max,
            count
        };
    }
    
    /**
     * Convertit une valeur en couleur heatmap selon le type de dégradé
     */
    getHeatmapColor(value, min, max) {
        if (min === max) {
            return 'rgb(128, 128, 128)'; // Gris si toutes les valeurs sont identiques
        }
        
        // Normaliser la valeur entre 0 et 1
        const normalized = (value - min) / (max - min);
        
        let r, g, b;
        
        switch (this.gradientType) {
            case 'viridis':
                ({ r, g, b } = this.interpolateColor(normalized, [
                    { at: 0, color: '#440154' },
                    { at: 0.25, color: '#3b528b' },
                    { at: 0.5, color: '#21908d' },
                    { at: 0.75, color: '#5dc863' },
                    { at: 1, color: '#fde725' }
                ]));
                break;
            case 'magma':
                ({ r, g, b } = this.interpolateColor(normalized, [
                    { at: 0, color: '#000004' },
                    { at: 0.33, color: '#51127c' },
                    { at: 0.66, color: '#b73779' },
                    { at: 1, color: '#fcfdbf' }
                ]));
                break;
            case 'icefire':
                ({ r, g, b } = this.interpolateColor(normalized, [
                    { at: 0, color: '#0c0c3a' },
                    { at: 0.25, color: '#1e90ff' },
                    { at: 0.5, color: '#ffffff' },
                    { at: 0.75, color: '#ff8c00' },
                    { at: 1, color: '#280000' }
                ]));
                break;
            case 'custom':
                ({ r, g, b } = this.customColor(normalized, min, max, value));
                break;
            default:
                ({ r, g, b } = this.interpolateColor(normalized, [
                    { at: 0, color: '#440154' },
                    { at: 0.25, color: '#3b528b' },
                    { at: 0.5, color: '#21908d' },
                    { at: 0.75, color: '#5dc863' },
                    { at: 1, color: '#fde725' }
                ]));
                break;
        }
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    /**
     * Interpole une couleur selon les stops
     */
    interpolateColor(t, stops) {
        // Trouver les deux stops entre lesquels interpoler
        let lowerStop = stops[0];
        let upperStop = stops[stops.length - 1];
        
        for (let i = 0; i < stops.length - 1; i++) {
            if (t >= stops[i].at && t <= stops[i + 1].at) {
                lowerStop = stops[i];
                upperStop = stops[i + 1];
                break;
            }
        }
        
        // Si t est en dehors des stops, utiliser le stop le plus proche
        if (t < lowerStop.at) {
            return this.hexToRgbObj(lowerStop.color);
        }
        if (t > upperStop.at) {
            return this.hexToRgbObj(upperStop.color);
        }
        
        // Interpoler entre les deux stops
        const range = upperStop.at - lowerStop.at;
        if (range === 0) {
            return this.hexToRgbObj(lowerStop.color);
        }
        
        const ratio = (t - lowerStop.at) / range;
        const lowerRgb = this.hexToRgbObj(lowerStop.color);
        const upperRgb = this.hexToRgbObj(upperStop.color);
        
        return {
            r: Math.round(lowerRgb.r + (upperRgb.r - lowerRgb.r) * ratio),
            g: Math.round(lowerRgb.g + (upperRgb.g - lowerRgb.g) * ratio),
            b: Math.round(lowerRgb.b + (upperRgb.b - lowerRgb.b) * ratio)
        };
    }
    
    /**
     * Dégradé personnalisé avec deux couleurs (+ et -)
     */
    customColor(normalized, min, max, value) {
        const customColorNegative = document.getElementById('customColorNegative');
        const customColorPositive = document.getElementById('customColorPositive');
        
        let negativeColor = '#0000ff';
        let positiveColor = '#ff0000';
        
        if (customColorNegative) negativeColor = customColorNegative.value;
        if (customColorPositive) positiveColor = customColorPositive.value;
        
        const negativeRgb = this.hexToRgbObj(negativeColor);
        const positiveRgb = this.hexToRgbObj(positiveColor);
        
        // Si on a des valeurs négatives et positives, créer un dégradé avec point zéro
        if (min < 0 && max > 0) {
            const zeroPos = -min / (max - min);
            if (normalized < zeroPos) {
                // Zone négative : de min à 0, dégradé de negativeColor à blanc
                const t = normalized / zeroPos;
                const whiteRgb = { r: 255, g: 255, b: 255 };
                return {
                    r: Math.round(negativeRgb.r + (whiteRgb.r - negativeRgb.r) * t),
                    g: Math.round(negativeRgb.g + (whiteRgb.g - negativeRgb.g) * t),
                    b: Math.round(negativeRgb.b + (whiteRgb.b - negativeRgb.b) * t)
                };
            } else {
                // Zone positive : de 0 à max, dégradé de blanc à positiveColor
                const t = (normalized - zeroPos) / (1 - zeroPos);
                const whiteRgb = { r: 255, g: 255, b: 255 };
                return {
                    r: Math.round(whiteRgb.r + (positiveRgb.r - whiteRgb.r) * t),
                    g: Math.round(whiteRgb.g + (positiveRgb.g - whiteRgb.g) * t),
                    b: Math.round(whiteRgb.b + (positiveRgb.b - whiteRgb.b) * t)
                };
            }
        } else {
            // Tout est du même signe, dégradé simple de negative à positive
            return {
                r: Math.round(negativeRgb.r + (positiveRgb.r - negativeRgb.r) * normalized),
                g: Math.round(negativeRgb.g + (positiveRgb.g - negativeRgb.g) * normalized),
                b: Math.round(negativeRgb.b + (positiveRgb.b - negativeRgb.b) * normalized)
            };
        }
    }
    
    /**
     * Convertit hex en objet RGB
     */
    hexToRgbObj(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 128, g: 128, b: 128 };
    }
    
    
    /**
     * Convertit rgb() en objet {r, g, b}
     */
    hexToRgb(rgb) {
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
        return { r: 128, g: 128, b: 128 };
    }
    
    /**
     * Met à jour les statistiques affichées
     */
    updateStats(stats, rows, cols) {
        const statCount = document.getElementById('statCount');
        const statSize = document.getElementById('statSize');
        const statMax = document.getElementById('statMax');
        const statMin = document.getElementById('statMin');
        
        if (statCount) statCount.textContent = stats.count;
        if (statSize) statSize.textContent = `${rows}x${cols}`;
        if (statMax) statMax.textContent = stats.max.toFixed(3);
        if (statMin) statMin.textContent = stats.min.toFixed(3);
    }
    
    /**
     * Met à jour la légende heatmap selon le type de dégradé
     */
    updateLegend(min, max) {
        const legend = document.getElementById('heatmapLegend');
        const legendMin = document.getElementById('legendMin');
        const legendMax = document.getElementById('legendMax');
        
        if (legend) {
            legend.innerHTML = '';
            const gradient = document.createElement('div');
            gradient.style.width = '100%';
            gradient.style.height = '100%';
            
            // Créer le dégradé selon le type sélectionné
            if (this.gradientType === 'custom') {
                const customColorNegative = document.getElementById('customColorNegative');
                const customColorPositive = document.getElementById('customColorPositive');
                const negativeColor = customColorNegative ? customColorNegative.value : '#0000ff';
                const positiveColor = customColorPositive ? customColorPositive.value : '#ff0000';
                
                if (min < 0 && max > 0) {
                    // Dégradé avec point zéro (négatif -> blanc -> positif)
                    const zeroPos = (-min / (max - min)) * 100;
                    gradient.style.background = `linear-gradient(to right, ${negativeColor} 0%, #ffffff ${zeroPos}%, #ffffff ${zeroPos}%, ${positiveColor} 100%)`;
                } else {
                    gradient.style.background = `linear-gradient(to right, ${negativeColor}, ${positiveColor})`;
                }
            } else {
                const stops = [];
                const numStops = 20;
                for (let i = 0; i <= numStops; i++) {
                    const t = i / numStops;
                    const color = this.getHeatmapColor(min + (max - min) * t, min, max);
                    stops.push(color);
                }
                
                const gradientStr = stops.map((color, i) => {
                    const pos = (i / (stops.length - 1)) * 100;
                    return `${color} ${pos}%`;
                }).join(', ');
                
                gradient.style.background = `linear-gradient(to right, ${gradientStr})`;
            }
            
            legend.appendChild(gradient);
        }
        
        if (legendMin) legendMin.textContent = min.toFixed(3);
        if (legendMax) legendMax.textContent = max.toFixed(3);
    }
    
    createCellRefreshButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mesh-cell-refresh';
        button.setAttribute('aria-label', 'Rafraîchir la valeur depuis la machine');
        button.title = 'Rafraîchir la valeur depuis la machine';
        button.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7V4m0 0h3M4 4l3.5 3.5M16 13v3m0 0h-3m3 0l-3.5-3.5M6.464 6.464a6 6 0 018.485 0M13.536 13.536a6 6 0 01-8.485 0"></path></svg>';
        return button;
    }

    applyValueToCell(cell, value, stats) {
        const valueSpan = cell.querySelector('.mesh-cell-value');
        let numericValue = value;

        if (numericValue === '' || numericValue === null || numericValue === undefined) {
            numericValue = null;
        } else if (typeof numericValue !== 'number') {
            numericValue = parseFloat(numericValue);
            if (Number.isNaN(numericValue)) {
                numericValue = null;
            }
        }

        const coordinateLabel = cell.getAttribute('data-coordinates-label');
        const hasStats = stats && Number.isFinite(stats.min) && Number.isFinite(stats.max);
        const min = hasStats ? stats.min : (numericValue ?? 0);
        const max = hasStats ? stats.max : (numericValue ?? 0);

        if (numericValue === null) {
            cell.dataset.value = '';
            cell.style.backgroundColor = '#9ca3af'; // gray-400
            cell.style.color = '#ffffff';
            cell.style.fontWeight = '500';
            if (valueSpan) {
                valueSpan.textContent = '-';
            }
            if (coordinateLabel) {
                cell.title = coordinateLabel;
            } else {
                cell.removeAttribute('title');
            }
            cell.classList.remove('mesh-cell-refreshing');
            return;
        }

        const bgColor = this.getHeatmapColor(numericValue, min, max);
        cell.dataset.value = numericValue.toFixed(3);
        cell.style.backgroundColor = bgColor;
        const rgb = this.hexToRgb(bgColor);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        cell.style.color = brightness > 128 ? '#000000' : '#ffffff';
        cell.style.fontWeight = '500';
        if (valueSpan) {
            valueSpan.textContent = numericValue >= 0 ? `+${numericValue.toFixed(3)}` : numericValue.toFixed(3);
        }
        const tooltipParts = [];
        if (coordinateLabel) {
            tooltipParts.push(coordinateLabel);
        }
        tooltipParts.push(`Z=${numericValue.toFixed(3)} mm`);
        cell.title = tooltipParts.join(' • ');
        cell.classList.remove('mesh-cell-refreshing');
    }

    createMatrixCell(row, col, value, stats) {
        const cell = document.createElement('div');
        cell.className = 'mesh-cell editable';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const coordinates = this.getMeshPointCoordinates(row, col);
        if (coordinates) {
            const { x, y } = coordinates;
            const labelParts = [];

            if (Number.isFinite(x)) {
                cell.dataset.x = x.toFixed(3);
                labelParts.push(`X=${x.toFixed(2)} mm`);
            }

            if (Number.isFinite(y)) {
                cell.dataset.y = y.toFixed(3);
                labelParts.push(`Y=${y.toFixed(2)} mm`);
            }

            if (labelParts.length > 0) {
                cell.setAttribute('data-coordinates-label', labelParts.join(' • '));
            }
        }

        const refreshButton = this.createCellRefreshButton();
        const valueSpan = document.createElement('span');
        valueSpan.className = 'mesh-cell-value';

        cell.appendChild(refreshButton);
        cell.appendChild(valueSpan);

        this.applyValueToCell(cell, value, stats);

        refreshButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.requestPointRefresh(row, col, cell, refreshButton);
        });

        cell.addEventListener('click', () => this.editCell(cell, row, col));

        return cell;
    }

    /**
     * Affiche la matrice
     */
    renderMatrix(meshData) {
        const container = document.getElementById('meshContainer');
        if (!container) return;

        // Retirer le message par défaut si présent
        container.innerHTML = '';

        const { matrix, rows, cols } = meshData;
        const stats = this.calculateStats(matrix);
        this.minValue = stats.min;
        this.maxValue = stats.max;
        
        // Créer le tableau en plein écran
        const table = document.createElement('div');
        table.className = 'w-full h-full grid';
        table.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        table.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        
        // Lignes de données (sans headers/footers)
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const value = matrix[i][j];
                const cell = this.createMatrixCell(i, j, value, stats);
                table.appendChild(cell);
            }
        }

        container.innerHTML = '';
        container.appendChild(table);
        
        // Mettre à jour les statistiques
        this.updateStats(stats, rows, cols);
        this.updateLegend(stats.min, stats.max);

        // Rendre la vue 3D
        this.render3D(meshData);

        // Activer la correction automatique maintenant que les données sont disponibles
        this.updateAutoCorrectionAvailability();

        if (this.pointRefreshState && this.pointRefreshState.status === 'awaiting-data') {
            const { row: targetRow, col: targetCol } = this.pointRefreshState;
            const refreshedCell = table.querySelector(`.mesh-cell.editable[data-row="${targetRow}"][data-col="${targetCol}"]`);
            if (refreshedCell) {
                refreshedCell.classList.add('mesh-cell-refreshed');
                setTimeout(() => refreshedCell.classList.remove('mesh-cell-refreshed'), 1200);
            }
            this.notify(`Valeur du point (${targetRow + 1}, ${targetCol + 1}) mise à jour depuis la machine.`, 'success');
            this.pointRefreshState = null;
        } else if (this.pointRefreshState) {
            this.pointRefreshState = null;
        }
    }

    getMeshPointCoordinates(row, col) {
        if (!this.meshData) {
            return { x: null, y: null };
        }

        const { xCoordinates, yCoordinates } = this.meshData;
        let x = Array.isArray(xCoordinates) ? xCoordinates[col] : null;
        let y = Array.isArray(yCoordinates) ? yCoordinates[row] : null;

        if (typeof x === 'string') {
            const parsedX = parseFloat(x);
            x = Number.isNaN(parsedX) ? null : parsedX;
        }

        if (typeof y === 'string') {
            const parsedY = parseFloat(y);
            y = Number.isNaN(parsedY) ? null : parsedY;
        }

        if (!Number.isFinite(x)) {
            x = this.estimateCoordinateFromRange('x', col);
        }

        if (!Number.isFinite(y)) {
            y = this.estimateCoordinateFromRange('y', row);
        }

        return {
            x: Number.isFinite(x) ? x : null,
            y: Number.isFinite(y) ? y : null
        };
    }

    estimateCoordinateFromRange(axis, index) {
        if (!this.meshData) {
            return null;
        }

        const count = axis === 'x' ? this.meshData.cols : this.meshData.rows;
        if (!Number.isInteger(index) || index < 0 || index >= count) {
            return null;
        }

        const range = axis === 'x' ? this.meshData.xRange : this.meshData.yRange;
        if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) {
            return null;
        }

        if (count <= 1 || range.max === range.min) {
            return range.min;
        }

        const step = (range.max - range.min) / (count - 1);
        if (axis === 'x') {
            return range.min + (step * index);
        }

        return range.max - (step * index);
    }

    buildPointProbeCommand(row, col, coordinates = null) {
        const { x, y } = (coordinates || this.getMeshPointCoordinates(row, col)) || {};
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return null;
        }
        return `G30 X${x.toFixed(3)} Y${y.toFixed(3)}`;
    }

    async requestPointRefresh(row, col, cell, button) {
        if (!this.meshData || !Array.isArray(this.meshData.matrix)) {
            this.notify('Aucun mesh n\'est chargé.', 'error');
            return;
        }

        if (!this.lastMeshMachineId) {
            this.notify('Importez d\'abord un mesh depuis la machine pour rafraîchir un point.', 'error');
            return;
        }

        if (this.pointRefreshState) {
            this.notify('Une actualisation de point est déjà en cours.', 'warning');
            return;
        }

        const supportsSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
        if (!supportsSerial) {
            this.notify('La connexion série n\'est pas disponible sur ce navigateur.', 'error');
            return;
        }

        const coordinates = this.getMeshPointCoordinates(row, col);
        const pointCommand = this.buildPointProbeCommand(row, col, coordinates);
        if (!pointCommand) {
            this.notify('Impossible de déterminer les coordonnées de ce point pour lancer un palpage.', 'error');
            return;
        }

        const originalContent = button.innerHTML;
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = '<svg class="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C5.373 2 2 5.373 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z"></path></svg>';
        cell.classList.add('mesh-cell-refreshing');

        this.pointRefreshState = {
            row,
            col,
            status: 'loading',
            cell,
            button,
            originalContent,
            command: pointCommand,
            machineId: this.lastMeshMachineId,
            coordinates
        };

        try {
            if (typeof MachineManager === 'undefined') {
                throw new Error('Le gestionnaire de machines n\'est pas disponible.');
            }

            if (typeof window.machineManager === 'undefined') {
                window.machineManager = new MachineManager();
                await window.machineManager.loadMachinesFromDB();
            }

            const machineManager = window.machineManager;
            let machine = machineManager.machines.get(this.lastMeshMachineId);

            if (!machine) {
                await machineManager.loadMachinesFromDB();
                machine = machineManager.machines.get(this.lastMeshMachineId);
            }

            if (!machine) {
                throw new Error('Impossible de retrouver la machine associée à ce mesh.');
            }

            if (!machine.isConnected) {
                const authorizedPorts = supportsSerial ? await navigator.serial.getPorts() : [];
                if (authorizedPorts.length > 0) {
                    await machineManager.connectExistingMachine(this.lastMeshMachineId);
                } else {
                    await machineManager.authorizeAndConnect(this.lastMeshMachineId);
                }
                machine = machineManager.machines.get(this.lastMeshMachineId);
            }

            if (!machine || !machine.isConnected || !machine.port) {
                throw new Error('Impossible de se connecter à la machine pour rafraîchir le point.');
            }

            if (!machineManager.readers.has(this.lastMeshMachineId)) {
                machineManager.startReadingSerial(this.lastMeshMachineId);
            }

            if (this.importTimeout) {
                clearTimeout(this.importTimeout);
                this.importTimeout = null;
            }

            this.autoImportDone = false;
            this.machineDataBuffer = '';
            this.currentMeshMachineId = this.lastMeshMachineId;

            if (typeof this.serialUnsubscribe === 'function') {
                this.serialUnsubscribe();
                this.serialUnsubscribe = null;
            }

            this.serialUnsubscribe = machineManager.addSerialListener(({ machineId: emittedId, data }) => {
                if (emittedId === this.currentMeshMachineId) {
                    this.collectMachineData(`${data}\n`);
                }
            });

            const encoder = new TextEncoder();
            let writer = null;
            try {
                writer = machine.port.writable.getWriter();
                await writer.write(encoder.encode(`${pointCommand}\n`));
            } finally {
                writer?.releaseLock();
            }

            this.collectMachineData(`> ${pointCommand}\n`);
            if (this.pointRefreshState) {
                this.pointRefreshState.status = 'awaiting-data';
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement du point:', error);
            const message = error?.message || 'Échec du rafraîchissement du point.';
            this.failPointRefresh(message);
        }
    }

    failPointRefresh(message) {
        if (!this.pointRefreshState) {
            if (message) {
                this.notify(message, 'error');
            }
            return;
        }

        const { cell, button, originalContent } = this.pointRefreshState;
        if (cell) {
            cell.classList.remove('mesh-cell-refreshing');
        }
        if (button) {
            button.disabled = false;
            button.classList.remove('loading');
            if (typeof originalContent === 'string') {
                button.innerHTML = originalContent;
            }
        }

        if (typeof this.serialUnsubscribe === 'function') {
            this.serialUnsubscribe();
            this.serialUnsubscribe = null;
        }

        if (this.importTimeout) {
            clearTimeout(this.importTimeout);
            this.importTimeout = null;
        }

        this.currentMeshMachineId = null;
        this.machineDataBuffer = null;
        this.autoImportDone = false;

        if (message) {
            this.notify(message, 'error');
        }

        this.pointRefreshState = null;
    }

    /**
     * Initialise la scène 3D
     */
    init3D() {
        const canvas = document.getElementById('mesh3DCanvas');
        if (!canvas) return;

        // Vérifier que Three.js est disponible
        if (typeof THREE === 'undefined') {
            console.error('Three.js n\'est pas disponible');
            return;
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.pendingRender3D = false;
        this.is3DInteracting = false;

        // Scène
        this.scene3D = new THREE.Scene();
        this.scene3D.background = new THREE.Color(0xf3f4f6); // gray-100
        
        // Caméra - prendre en compte le padding
        const container = canvas.parentElement;
        // Calculer la largeur/hauteur disponible en tenant compte du padding
        const containerRect = container.getBoundingClientRect();
        const padding = 16; // 1rem = 16px
        const width = containerRect.width - (padding * 2);
        const height = containerRect.height - (padding * 2);
        
        this.camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera3D.position.set(10, 10, 10);
        this.camera3D.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer3D = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer3D.setSize(width, height);
        const pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
        this.renderer3D.setPixelRatio(Math.min(pixelRatio, 1.75));
        
        // Contrôles - Essayer différentes façons d'accéder à OrbitControls
        const initControls = () => {
            let OrbitControlsClass = null;
            
            // Essayer THREE.OrbitControls (depuis ES modules)
            if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                OrbitControlsClass = THREE.OrbitControls;
            }
            // Essayer OrbitControls global
            else if (typeof OrbitControls !== 'undefined') {
                OrbitControlsClass = OrbitControls;
            }
            // Essayer window.OrbitControls
            else if (typeof window !== 'undefined' && typeof window.OrbitControls !== 'undefined') {
                OrbitControlsClass = window.OrbitControls;
            }
            
            if (OrbitControlsClass) {
                this.controls3D = new OrbitControlsClass(this.camera3D, this.renderer3D.domElement);
                this.controls3D.enableDamping = true;
                this.controls3D.dampingFactor = 0.05;
                this.controls3D.enableZoom = true;
                this.controls3D.enablePan = true;
                this.controls3D.enableRotate = true;
                this.controls3D.addEventListener('start', () => {
                    this.is3DInteracting = true;
                    this.start3DInteractionLoop();
                });
                this.controls3D.addEventListener('end', () => {
                    this.is3DInteracting = false;
                    this.start3DInteractionLoop();
                });
                this.controls3D.addEventListener('change', () => {
                    if (!this.is3DInteracting) {
                        this.scheduleRender3DFrame();
                    }
                });
                console.log('OrbitControls initialisé avec succès');
            } else {
                console.warn('OrbitControls n\'est pas encore disponible, attente du chargement...');
                this.controls3D = null;
                
                // Écouter l'événement orbitcontrols-ready
                const onControlsReady = () => {
                    let OrbitControlsClass = null;
                    
                    if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                        OrbitControlsClass = THREE.OrbitControls;
                    } else if (typeof OrbitControls !== 'undefined') {
                        OrbitControlsClass = OrbitControls;
                    } else if (typeof window !== 'undefined' && typeof window.OrbitControls !== 'undefined') {
                        OrbitControlsClass = window.OrbitControls;
                    }
                    
                    if (OrbitControlsClass && !this.controls3D) {
                        this.controls3D = new OrbitControlsClass(this.camera3D, this.renderer3D.domElement);
                        this.controls3D.enableDamping = true;
                        this.controls3D.dampingFactor = 0.05;
                        this.controls3D.enableZoom = true;
                        this.controls3D.enablePan = true;
                        this.controls3D.enableRotate = true;
                        this.controls3D.addEventListener('start', () => {
                            this.is3DInteracting = true;
                            this.start3DInteractionLoop();
                        });
                        this.controls3D.addEventListener('end', () => {
                            this.is3DInteracting = false;
                            this.start3DInteractionLoop();
                        });
                        this.controls3D.addEventListener('change', () => {
                            if (!this.is3DInteracting) {
                                this.scheduleRender3DFrame();
                            }
                        });
                        console.log('OrbitControls initialisé après chargement');
                        window.removeEventListener('orbitcontrols-ready', onControlsReady);
                    }
                };
                
                // Vérifier si l'événement a déjà été déclenché
                if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                    onControlsReady();
                } else {
                    window.addEventListener('orbitcontrols-ready', onControlsReady);
                    
                    // Réessayer après un délai au cas où l'événement n'est pas déclenché
                    setTimeout(() => {
                        if (!this.controls3D) {
                            onControlsReady();
                        }
                    }, 1500);
                }
            }
        };
        
        initControls();
        // Lumière - améliorée pour des couleurs plus vives
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Augmenté de 0.6 à 0.8
        this.scene3D.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0); // Augmenté de 0.8 à 1.0
        directionalLight1.position.set(10, 10, 5);
        this.scene3D.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight2.position.set(-10, 10, -5);
        this.scene3D.add(directionalLight2);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 10, 0);
        this.scene3D.add(pointLight);
        
        // Grille et axes seront ajoutés dynamiquement quand le mesh est rendu
        this.gridHelper = null;
        this.axesHelper = null;

        // Gérer le redimensionnement
        const handleResize = () => {
            if (canvas && canvas.parentElement) {
                const containerRect = canvas.parentElement.getBoundingClientRect();
                const padding = 16;
                const width = containerRect.width - (padding * 2);
                const height = containerRect.height - (padding * 2);
                this.camera3D.aspect = width / height;
                this.camera3D.updateProjectionMatrix();
                this.renderer3D.setSize(width, height);
                this.scheduleRender3DFrame();
            }
        };
        window.addEventListener('resize', handleResize);

        this.scheduleRender3DFrame();
    }

    invalidateMesh3DCache() {
        this.mesh3DRenderCache = null;
    }

    markMeshDataDirty() {
        this.meshDataVersion += 1;
        this.invalidateMesh3DCache();
        this.scheduleRender3DFrame();
    }

    render3DFrame() {
        if (!this.renderer3D || !this.scene3D || !this.camera3D) {
            return;
        }

        if (this.controls3D && !this.is3DInteracting) {
            this.controls3D.update();
        }

        this.renderer3D.render(this.scene3D, this.camera3D);
    }

    scheduleRender3DFrame() {
        if (this.animationId || this.pendingRender3D) {
            return;
        }

        this.pendingRender3D = true;
        requestAnimationFrame(() => {
            this.pendingRender3D = false;
            this.render3DFrame();
        });
    }

    start3DInteractionLoop() {
        if (this.animationId || !this.renderer3D || !this.scene3D || !this.camera3D) {
            return;
        }

        const animate = () => {
            if (!this.renderer3D || !this.scene3D || !this.camera3D) {
                this.animationId = null;
                return;
            }

            let shouldContinue = false;
            if (this.controls3D) {
                shouldContinue = this.controls3D.update();
            }

            this.renderer3D.render(this.scene3D, this.camera3D);

            if (this.is3DInteracting || shouldContinue) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.animationId = null;
            }
        };

        this.animationId = requestAnimationFrame(animate);
    }

    /**
     * Retourne le libellé du niveau de lissage actuel
     */
    getMeshSmoothingLabel(level) {
        const index = Math.max(0, Math.min(this.mesh3DSmoothingLabels.length - 1, level));
        return this.mesh3DSmoothingLabels[index] || `Niveau ${index + 1}`;
    }

    /**
     * Calcule la matrice utilisée pour le rendu 3D avec le lissage sélectionné
     */
    getMesh3DRenderMatrix(matrix) {
        if (!Array.isArray(matrix)) {
            return matrix;
        }

        const level = this.mesh3DSmoothingLevel;

        if (
            this.mesh3DRenderCache &&
            this.mesh3DRenderCache.version === this.meshDataVersion &&
            this.mesh3DRenderCache.level === level &&
            Array.isArray(this.mesh3DRenderCache.matrix)
        ) {
            return this.mesh3DRenderCache.matrix;
        }

        if (level <= 0) {
            this.mesh3DRenderCache = {
                level,
                version: this.meshDataVersion,
                matrix
            };
            return matrix;
        }

        const smoothed = this.applyMeshSmoothing(matrix, level);
        this.mesh3DRenderCache = {
            level,
            version: this.meshDataVersion,
            matrix: smoothed
        };
        return smoothed;
    }

    /**
     * Applique un lissage par moyenne locale sur plusieurs itérations
     */
    applyMeshSmoothing(matrix, iterations) {
        const rows = Array.isArray(matrix) ? matrix.length : 0;
        const cols = rows > 0 && Array.isArray(matrix[0]) ? matrix[0].length : 0;

        if (rows === 0 || cols === 0) {
            return matrix;
        }

        let current = matrix.map(row => row.map(value => value));

        for (let iter = 0; iter < iterations; iter++) {
            const next = current.map(row => row.slice());

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const currentValue = current[i][j];

                    if (currentValue === null || currentValue === undefined || Number.isNaN(currentValue)) {
                        next[i][j] = null;
                        continue;
                    }

                    let sum = 0;
                    let count = 0;

                    for (let di = -1; di <= 1; di++) {
                        for (let dj = -1; dj <= 1; dj++) {
                            const ni = i + di;
                            const nj = j + dj;

                            if (ni < 0 || ni >= rows || nj < 0 || nj >= cols) {
                                continue;
                            }

                            const neighbor = current[ni][nj];

                            if (neighbor === null || neighbor === undefined || Number.isNaN(neighbor)) {
                                continue;
                            }

                            sum += neighbor;
                            count++;
                        }
                    }

                    if (count > 0) {
                        next[i][j] = sum / count;
                    } else {
                        next[i][j] = currentValue;
                    }
                }
            }

            current = next;
        }

        return current;
    }

    /**
     * Rend le mesh en 3D
     */
    render3D(meshData) {
        if (!meshData || !this.scene3D) {
            // Initialiser la scène 3D si nécessaire
            this.init3D();
            if (!this.scene3D) return;
        }
        
        const { matrix } = meshData;
        const renderMatrix = this.getMesh3DRenderMatrix(matrix);
        const stats = this.calculateStats(renderMatrix);
        const rows = renderMatrix.length || meshData.rows || 0;
        const cols = (renderMatrix[0] ? renderMatrix[0].length : 0) || meshData.cols || 0;

        this.pendingRender3D = false;

        // Supprimer l'ancien mesh s'il existe
        if (this.mesh3D) {
            this.scene3D.remove(this.mesh3D);
            this.mesh3D.geometry.dispose();
            if (this.mesh3D.material instanceof THREE.Material) {
                this.mesh3D.material.dispose();
            } else if (Array.isArray(this.mesh3D.material)) {
                this.mesh3D.material.forEach(mat => mat.dispose());
            }
            this.mesh3D = null;
        }
        
        // Supprimer l'ancienne grille et axes si elles existent
        if (this.gridHelper) {
            this.scene3D.remove(this.gridHelper);
            this.gridHelper = null;
        }
        if (this.axesHelper) {
            this.scene3D.remove(this.axesHelper);
            this.axesHelper = null;
        }
        
        // Créer la géométrie du mesh
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const indices = [];
        
        // Espacement entre les points
        const spacing = 0.5;
        const scale = this.mesh3DZScale; // Échelle pour la hauteur (paramétrable)
        
        // Mapper les points valides pour gérer les valeurs manquantes
        const pointMap = new Map(); // Map de (i, j) -> index dans vertices
        let vertexIndex = 0;
        
        // Créer les vertices et les couleurs
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const value = renderMatrix[i][j];
                
                if (value === null) {
                    // Valeur manquante : ne pas créer de vertex
                    continue;
                }
                
                const x = (j - cols / 2) * spacing;
                const z = (rows - 1 - i - rows / 2) * spacing; // Inverser i pour correspondre à la vue 2D
                const y = value * scale;
                
                vertices.push(x, y, z);
                
                // Couleur selon le gradient - utiliser les couleurs telles quelles (identiques à la vue 2D)
                const color = this.getHeatmapColor(value, stats.min, stats.max);
                const rgb = this.hexToRgb(color);
                colors.push(rgb.r / 255, rgb.g / 255, rgb.b / 255);
                
                // Stocker l'index pour ce point
                pointMap.set(`${i}-${j}`, vertexIndex);
                vertexIndex++;
            }
        }
        
        // Créer les faces (triangles) pour former une surface
        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                // Vérifier que les 4 points existent (pas de valeurs manquantes)
                const p1 = pointMap.get(`${i}-${j}`);
                const p2 = pointMap.get(`${i}-${j + 1}`);
                const p3 = pointMap.get(`${i + 1}-${j}`);
                const p4 = pointMap.get(`${i + 1}-${j + 1}`);
                
                if (p1 !== undefined && p2 !== undefined && p3 !== undefined && p4 !== undefined) {
                    // Triangle 1
                    indices.push(p1, p3, p2);
                    // Triangle 2
                    indices.push(p2, p3, p4);
                }
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Matériau avec couleurs plates (sans éclairage pour afficher les couleurs telles quelles)
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            flatShading: this.mesh3DSmoothingLevel === 0 // Lissage selon le paramètre
        });
        
        this.mesh3D = new THREE.Mesh(geometry, material);
        this.scene3D.add(this.mesh3D);
        
        // Supprimer l'ancienne grille et axes si elles existent
        if (this.gridHelper) {
            this.scene3D.remove(this.gridHelper);
        }
        if (this.axesHelper) {
            this.scene3D.remove(this.axesHelper);
        }
        
        // Calculer les dimensions réelles du mesh pour centrer la grille
        const box = new THREE.Box3().setFromObject(this.mesh3D);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Créer une grille de référence centrée horizontalement sur le mesh
        const gridSize = Math.max(size.x, size.z) * 1.8; // Grille légèrement plus grande que le mesh
        const gridDivisions = Math.max(rows, cols);
        this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0xcccccc);
        // Centrer la grille horizontalement sur le mesh (x et z), mais la garder à y=0
        this.gridHelper.position.set(center.x, 0, center.z);
        this.scene3D.add(this.gridHelper);
        
        // Axes centrés sur le mesh
        const axesSize = Math.max(size.x, size.y, size.z) * 0.5;
        this.axesHelper = new THREE.AxesHelper(axesSize);
        this.axesHelper.position.copy(center);
        this.scene3D.add(this.axesHelper);
        
        // Ajuster la caméra pour voir tout le mesh
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera3D.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8; // 1.8x pour avoir une marge confortable
        
        // Positionner la caméra pour voir le mesh de face en diagonale, centrée sur le mesh
        this.camera3D.position.set(
            center.x + cameraDistance * 0.7,
            center.y + Math.max(size.y * 0.5, cameraDistance * 0.5), // Ajuster selon la hauteur du mesh
            center.z + cameraDistance * 0.7
        );
        
        // Centrer les contrôles sur le centre du mesh
        if (this.controls3D) {
            this.controls3D.target.copy(center);
            this.controls3D.update();
        } else {
            // Fallback si pas de contrôles : regarder vers le center
            this.camera3D.lookAt(center);
        }

        this.scheduleRender3DFrame();
    }
    
    /**
     * Édite une cellule
     */
    editCell(cell, row, col) {
        const valueStr = cell.dataset.value;
        const currentValue = valueStr === '' || valueStr === null || valueStr === undefined ? null : parseFloat(valueStr);
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue === null ? '' : (currentValue >= 0 ? `+${currentValue.toFixed(3)}` : currentValue.toFixed(3));
        input.className = 'mesh-cell';
        input.style.backgroundColor = cell.style.backgroundColor;
        input.style.color = cell.style.color;
        input.style.border = '2px solid #3b82f6';
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.textAlign = 'center';
        input.style.fontSize = '0.75rem';
        input.style.fontWeight = '500';
        
        const container = cell.parentElement;
        container.replaceChild(input, cell);
        input.focus();
        input.select();
        
        const save = () => {
            const inputValue = input.value.trim();
            
            // Si vide, c'est une valeur manquante
            if (inputValue === '' || inputValue === '-') {
                this.meshData.matrix[row][col] = null;
                this.markMeshDataDirty();

                // Recalculer les statistiques
                const stats = this.calculateStats(this.meshData.matrix);
                this.minValue = stats.min;
                this.maxValue = stats.max;

                // Recréer la cellule avec valeur manquante
                const newCell = this.createMatrixCell(row, col, null, stats);

                container.replaceChild(newCell, input);

                // Mettre à jour toutes les cellules pour recalculer les couleurs
                this.updateMatrixColors(stats.min, stats.max);
                
                // Mettre à jour les statistiques
                this.updateStats(stats, this.meshData.rows, this.meshData.cols);
                this.updateLegend(stats.min, stats.max);
            } else {
                const newValue = parseFloat(inputValue.replace(/\+/g, ''));
                if (!isNaN(newValue)) {
                    // Mettre à jour la matrice
                    this.meshData.matrix[row][col] = newValue;
                    this.markMeshDataDirty();

                    // Recalculer les statistiques
                    const stats = this.calculateStats(this.meshData.matrix);
                    this.minValue = stats.min;
                    this.maxValue = stats.max;

                    // Recréer la cellule avec la nouvelle valeur
                    const newCell = this.createMatrixCell(row, col, newValue, stats);

                    container.replaceChild(newCell, input);

                    // Mettre à jour toutes les cellules pour recalculer les couleurs
                    this.updateMatrixColors(stats.min, stats.max);
                    
                    // Mettre à jour les statistiques
                    this.updateStats(stats, this.meshData.rows, this.meshData.cols);
                    this.updateLegend(stats.min, stats.max);
                } else {
                    container.replaceChild(cell, input);
                }
            }
        };
        
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                container.replaceChild(cell, input);
            }
        });
    }
    
    /**
     * Met à jour les couleurs de toutes les cellules
     */
    updateMatrixColors(min, max) {
        const cells = document.querySelectorAll('.mesh-cell.editable');
        const stats = { min, max };
        cells.forEach(cell => {
            const valueStr = cell.dataset.value;
            const value = valueStr === '' || valueStr === null || valueStr === undefined
                ? null
                : parseFloat(valueStr);
            this.applyValueToCell(cell, Number.isNaN(value) ? null : value, stats);
        });

        // Mettre à jour la vue 3D si elle existe
        if (this.meshData && this.scene3D) {
            this.render3D(this.meshData);
        }
    }
    
    /**
     * Importe les données mesh
     */
    importMesh() {
        const textarea = document.getElementById('meshImport');
        if (!textarea) return;

        const text = textarea.value.trim();
        if (!text) {
            this.notify('Veuillez coller des données mesh.', 'error');
            return;
        }

        const meshData = this.parseMeshData(text);
        if (!meshData) {
            this.notify('Format de données invalide. Veuillez vérifier le format.', 'error');
            return;
        }

        this.meshData = meshData;
        this.markMeshDataDirty();
        this.renderMatrix(meshData);
        this.lastMeshMachineId = null;
        this.lastMeshMachineUuid = null;

        // Fermer le modal après import réussi
        this.closeImportModal();

        // Masquer les infos de détection
        const importInfo = document.getElementById('importInfo');
        if (importInfo) {
            importInfo.classList.add('hidden');
        }

        this.notify(`Mesh importé (${meshData.rows}x${meshData.cols}).`, 'success');
    }
    
    /**
     * Affiche le modal de sélection de machine
     */
    async showMachineSelection(preferredUuid = null) {
        const machineSelectModal = document.getElementById('machineSelectModal');
        const machineList = document.getElementById('machineList');
        const refreshButton = document.getElementById('refreshMachineList');

        if (!machineSelectModal || !machineList) return;

        const currentDropdown = document.getElementById('machineDropdown');
        const lastSelection = preferredUuid || currentDropdown?.value || this.lastMeshMachineUuid || null;

        machineSelectModal.classList.remove('hidden');
        machineList.innerHTML = `
            <div class="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Chargement des machines...</span>
            </div>
        `;

        if (refreshButton && refreshButton.dataset.bound !== 'true') {
            refreshButton.addEventListener('click', () => {
                const dropdown = document.getElementById('machineDropdown');
                const current = dropdown ? dropdown.value : null;
                refreshButton.classList.add('animate-pulse');
                this.showMachineSelection(current || null).finally(() => {
                    setTimeout(() => refreshButton.classList.remove('animate-pulse'), 300);
                });
            });
            refreshButton.dataset.bound = 'true';
        }

        try {
            const response = await fetch('/api/machines', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des machines');
            }

            const machines = await response.json();
            const connectedMachineIds = this.getConnectedMachineUuidSet();

            this.renderMachineSelection(machines, connectedMachineIds, lastSelection);
        } catch (error) {
            console.error('Erreur lors du chargement des machines:', error);
            machineList.innerHTML = `
                <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
                    Erreur&nbsp;: ${this.escapeHtml(error.message || 'Chargement impossible')}
                </div>
            `;
        }
    }

    getConnectedMachineUuidSet() {
        const connected = new Set();
        if (typeof window.machineManager !== 'undefined' && window.machineManager?.machines) {
            window.machineManager.machines.forEach((machine) => {
                if (machine && machine.uuid && machine.isConnected) {
                    connected.add(machine.uuid);
                }
            });
        }
        return connected;
    }

    renderMachineSelection(machines, connectedMachineIds, selectedUuid) {
        const machineList = document.getElementById('machineList');
        if (!machineList) return;

        if (!Array.isArray(machines) || machines.length === 0) {
            machineList.innerHTML = `
                <div class="space-y-3 rounded-lg border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800/70 dark:text-gray-300">
                    <div class="flex items-start gap-3">
                        <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
                        </svg>
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">Aucune machine enregistrée</p>
                            <p class="mt-1 text-xs leading-relaxed">Ajoutez votre première machine pour importer un mesh directement depuis l&rsquo;imprimante.</p>
                        </div>
                    </div>
                    <button
                        id="addMachineFromModal"
                        type="button"
                        class="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Ajouter une machine
                    </button>
                </div>
            `;

            const addBtn = document.getElementById('addMachineFromModal');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.handleAddMachineFromModal(addBtn));
            }
            return;
        }

        const sortedMachines = [...machines].sort((a, b) => {
            const aConnected = connectedMachineIds.has(a.uuid);
            const bConnected = connectedMachineIds.has(b.uuid);
            if (aConnected !== bConnected) {
                return aConnected ? -1 : 1;
            }
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            return aName.localeCompare(bName);
        });

        machineList.innerHTML = `
            <div class="space-y-5" id="machineSelectionWrapper">
                <div>
                    <label for="machineDropdown" class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Machine à interroger</label>
                    <div class="relative mt-2">
                        <select
                            id="machineDropdown"
                            class="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        ></select>
                        <span class="machine-select-chevron absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9.75l3.75 3.75 3.75-3.75" />
                            </svg>
                        </span>
                    </div>
                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span id="machineStatusBadge" class="machine-status-badge bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            <span id="machineStatusDot" class="machine-status-dot bg-gray-400"></span>
                            <span id="machineStatusLabel">En attente</span>
                        </span>
                        <span id="machineStatusHint" class="text-xs">Sélectionnez une machine disponible.</span>
                    </div>
                    <p id="machineSelectionDetails" class="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        Choisissez une machine pour lancer l&rsquo;import depuis le plateau.
                    </p>
                </div>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                        id="connectSelectedMachine"
                        type="button"
                        class="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25M21 12H9" />
                        </svg>
                        Importer depuis la machine
                    </button>
                    <button
                        id="addMachineFromModal"
                        type="button"
                        class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 sm:w-auto"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Ajouter une machine
                    </button>
                </div>
                <div class="rounded-lg border border-dashed border-gray-300 p-4 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    <p class="font-medium text-gray-700 dark:text-gray-200">Astuce</p>
                    <p class="mt-1 leading-relaxed">Assurez-vous d&rsquo;avoir autorisé la machine via le navigateur avant d&rsquo;importer un mesh.</p>
                </div>
            </div>
        `;

        const dropdown = document.getElementById('machineDropdown');
        if (!dropdown) {
            return;
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Sélectionnez une machine';
        placeholder.disabled = true;
        dropdown.appendChild(placeholder);

        let selectionApplied = false;
        sortedMachines.forEach((machine) => {
            const option = document.createElement('option');
            option.value = machine.uuid;
            option.textContent = `${machine.name || 'Machine sans nom'}${machine.last_port ? ` — ${machine.last_port}` : ''}`;
            option.dataset.name = machine.name || 'Machine';
            option.dataset.baud = machine.baud_rate ? String(machine.baud_rate) : '115200';
            option.dataset.port = machine.last_port || '';
            option.dataset.connected = connectedMachineIds.has(machine.uuid) ? 'true' : 'false';
            dropdown.appendChild(option);
            if (!selectionApplied && selectedUuid && machine.uuid === selectedUuid) {
                option.selected = true;
                selectionApplied = true;
            }
        });

        if (!selectionApplied && dropdown.options.length > 1) {
            dropdown.selectedIndex = 1;
        } else if (!selectionApplied) {
            placeholder.selected = true;
        }

        const addBtn = document.getElementById('addMachineFromModal');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddMachineFromModal(addBtn));
        }

        this.setupMachineSelectionInteractions();
    }

    setupMachineSelectionInteractions() {
        const dropdown = document.getElementById('machineDropdown');
        const connectBtn = document.getElementById('connectSelectedMachine');
        const statusBadge = document.getElementById('machineStatusBadge');
        const statusDot = document.getElementById('machineStatusDot');
        const statusLabel = document.getElementById('machineStatusLabel');
        const statusHint = document.getElementById('machineStatusHint');
        const detailsElement = document.getElementById('machineSelectionDetails');

        const update = () => {
            this.updateMachineSelectionDetails({ dropdown, statusBadge, statusDot, statusLabel, statusHint, detailsElement });
            if (connectBtn) {
                connectBtn.disabled = !(dropdown && dropdown.value);
            }
        };

        if (dropdown) {
            dropdown.addEventListener('change', update);
        }

        if (connectBtn) {
            connectBtn.addEventListener('click', (event) => {
                if (!dropdown || !dropdown.value) {
                    this.notify('Sélectionnez une machine à connecter.', 'warning');
                    return;
                }
                const option = dropdown.selectedOptions[0];
                const machineData = {
                    uuid: option.value,
                    name: option.dataset.name,
                    baudRate: parseInt(option.dataset.baud, 10),
                    port: option.dataset.port
                };
                this.connectAndImportFromMachine(machineData, event);
            });
        }

        update();
    }

    updateMachineSelectionDetails({ dropdown, statusBadge, statusDot, statusLabel, statusHint, detailsElement }) {
        if (!dropdown || !statusBadge || !statusDot || !statusLabel || !detailsElement) {
            return;
        }

        const option = dropdown.selectedOptions?.[0];
        if (!option || !option.value) {
            statusBadge.classList.remove('bg-green-100', 'text-green-700', 'dark:bg-green-900/40', 'dark:text-green-200', 'bg-amber-100', 'text-amber-700', 'dark:bg-amber-900/40', 'dark:text-amber-200');
            statusBadge.classList.add('bg-gray-100', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
            statusDot.style.backgroundColor = '#9ca3af';
            statusLabel.textContent = 'En attente';
            if (statusHint) {
                statusHint.textContent = 'Sélectionnez une machine disponible.';
            }
            detailsElement.textContent = 'Choisissez une machine pour lancer l’import depuis le plateau.';
            return;
        }

        const name = option.dataset.name || 'Machine';
        const port = option.dataset.port ? `Port ${option.dataset.port}` : 'Port inconnu';
        const baud = option.dataset.baud ? `${option.dataset.baud} bauds` : 'Vitesse non définie';
        const isConnected = option.dataset.connected === 'true';

        statusBadge.classList.remove('bg-gray-100', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200', 'bg-amber-100', 'text-amber-700', 'dark:bg-amber-900/40', 'dark:text-amber-200', 'bg-green-100', 'text-green-700', 'dark:bg-green-900/40', 'dark:text-green-200');

        if (isConnected) {
            statusBadge.classList.add('bg-green-100', 'text-green-700', 'dark:bg-green-900/40', 'dark:text-green-200');
            statusDot.style.backgroundColor = '#16a34a';
            statusLabel.textContent = 'Connectée';
            if (statusHint) {
                statusHint.textContent = 'La liaison série est prête pour les commandes.';
            }
        } else {
            statusBadge.classList.add('bg-amber-100', 'text-amber-700', 'dark:bg-amber-900/40', 'dark:text-amber-200');
            statusDot.style.backgroundColor = '#d97706';
            statusLabel.textContent = 'Autorisation requise';
            if (statusHint) {
                statusHint.textContent = 'L’autorisation série sera demandée lors de l’import.';
            }
        }

        detailsElement.textContent = `Machine « ${name} » — ${port}, ${baud}.`;
    }

    async handleAddMachineFromModal(button) {
        const supportsSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
        if (!supportsSerial) {
            this.notify('La Web Serial API n’est pas disponible sur ce navigateur.', 'error');
            return;
        }

        let originalContent = null;
        if (button) {
            button.disabled = true;
            originalContent = button.innerHTML;
            button.innerHTML = '<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C5.373 2 2 5.373 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z"></path></svg>';
        }

        try {
            if (typeof MachineManager === 'undefined') {
                throw new Error('Le gestionnaire de machines n’est pas disponible.');
            }

            if (typeof window.machineManager === 'undefined') {
                window.machineManager = new MachineManager();
                await window.machineManager.loadMachinesFromDB();
            }

            await window.machineManager.addMachine();
            await this.showMachineSelection();
        } catch (error) {
            console.error('Erreur lors de l’ajout de la machine depuis le mesh viewer:', error);
            const message = error?.message || 'Impossible d’ajouter la machine.';
            this.notify(message, 'error');
        } finally {
            if (button) {
                button.disabled = false;
                if (originalContent) {
                    button.innerHTML = originalContent;
                }
            }
        }
    }

    escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    /**
     * Ferme le modal de sélection de machine
     */
    closeMachineSelection() {
        const machineSelectModal = document.getElementById('machineSelectModal');
        if (machineSelectModal) {
            machineSelectModal.classList.add('hidden');
        }
        if (typeof this.serialUnsubscribe === 'function') {
            this.serialUnsubscribe();
            this.serialUnsubscribe = null;
        }
        if (this.importTimeout) {
            clearTimeout(this.importTimeout);
            this.importTimeout = null;
        }
        this.currentMeshMachineId = null;
        this.machineDataBuffer = null;
        this.autoImportDone = false;
    }
    
    /**
     * Collecte les données reçues de la machine et détecte quand c'est complet
     */
    collectMachineData(text) {
        // Stocker les données reçues
        if (!this.machineDataBuffer) {
            this.machineDataBuffer = '';
        }
        this.machineDataBuffer += text;

        // Log pour débogage
        console.log('Données collectées:', text.substring(0, 100));
        console.log('Buffer total:', this.machineDataBuffer.length, 'caractères');

        if (this.pointRefreshState) {
            this.tryFinalizePointRefresh();
        } else {
            // Vérifier si la réponse est complète
            this.checkAndImportFromBuffer();
        }
    }

    tryFinalizePointRefresh() {
        if (!this.pointRefreshState || !this.machineDataBuffer) {
            return;
        }

        const buffer = this.machineDataBuffer;
        const hasOk = /(^|\n|\r)ok\b/i.test(buffer.trim());
        if (!hasOk) {
            return;
        }

        const value = this.parsePointProbeValueFromBuffer(buffer);
        if (typeof value !== 'number' || Number.isNaN(value)) {
            this.failPointRefresh('Impossible d’interpréter la réponse de la machine pour ce point.');
            return;
        }

        this.finalizePointRefresh(value);
    }

    parsePointProbeValueFromBuffer(text) {
        if (!text) {
            return null;
        }

        const sanitized = text.replace(/\r/g, '\n');
        const lines = sanitized.split('\n').map(line => line.trim()).filter(Boolean);
        const candidates = [];

        for (const line of lines) {
            if (!line || line.startsWith('>') || /^ok\b/i.test(line)) {
                continue;
            }

            const zMatch = line.match(/(?:^|\s)Z[:=]\s*([+-]?\d+(?:\.\d+)?)/i);
            if (zMatch) {
                const parsed = parseFloat(zMatch[1]);
                if (!Number.isNaN(parsed)) {
                    return parsed;
                }
            }

            const explicitMatch = line.match(/(?:value|mesure|hauteur|height|offset)[:=\s]+([+-]?\d+(?:\.\d+)?)/i);
            if (explicitMatch) {
                const parsed = parseFloat(explicitMatch[1]);
                if (!Number.isNaN(parsed)) {
                    candidates.push(parsed);
                    continue;
                }
            }

            const decimals = line.match(/[+-]?\d+\.\d+/g);
            if (decimals) {
                decimals.forEach((item) => {
                    const parsed = parseFloat(item);
                    if (!Number.isNaN(parsed)) {
                        candidates.push(parsed);
                    }
                });
            }
        }

        if (candidates.length > 0) {
            return candidates[candidates.length - 1];
        }

        return null;
    }

    finalizePointRefresh(value) {
        if (!this.pointRefreshState) {
            return;
        }

        const { row, col, cell, button, originalContent, machineId, coordinates } = this.pointRefreshState;

        if (button) {
            button.disabled = false;
            button.classList.remove('loading');
            if (typeof originalContent === 'string') {
                button.innerHTML = originalContent;
            }
        }

        if (cell) {
            cell.classList.remove('mesh-cell-refreshing');
        }

        if (typeof this.serialUnsubscribe === 'function') {
            this.serialUnsubscribe();
            this.serialUnsubscribe = null;
        }

        if (this.importTimeout) {
            clearTimeout(this.importTimeout);
            this.importTimeout = null;
        }

        this.currentMeshMachineId = null;
        this.machineDataBuffer = null;
        this.autoImportDone = false;

        let numericValue = value;
        if (typeof numericValue !== 'number') {
            numericValue = parseFloat(numericValue);
        }
        if (Number.isNaN(numericValue)) {
            numericValue = null;
        }

        if (this.meshData && Array.isArray(this.meshData.matrix) && numericValue !== null) {
            this.meshData.matrix[row][col] = numericValue;
            this.markMeshDataDirty();

            const stats = this.calculateStats(this.meshData.matrix);
            this.minValue = stats.min;
            this.maxValue = stats.max;

            if (cell) {
                this.applyValueToCell(cell, numericValue, stats);
                cell.classList.add('mesh-cell-refreshed');
                setTimeout(() => {
                    if (cell && cell.classList) {
                        cell.classList.remove('mesh-cell-refreshed');
                    }
                }, 1200);
            }

            this.updateStats(stats, this.meshData.rows, this.meshData.cols);
            this.updateLegend(stats.min, stats.max);
            this.updateMatrixColors(stats.min, stats.max);
        }

        const pointCoordinates = coordinates || this.getMeshPointCoordinates(row, col) || {};
        let coordinateSuffix = '';
        if (Number.isFinite(pointCoordinates.x) && Number.isFinite(pointCoordinates.y)) {
            coordinateSuffix = ` (X=${pointCoordinates.x.toFixed(2)} Y=${pointCoordinates.y.toFixed(2)})`;
        }

        if (numericValue !== null) {
            this.notify(`Valeur du point (${row + 1}, ${col + 1})${coordinateSuffix} mise à jour: ${numericValue.toFixed(3)} mm`, 'success');
        } else {
            this.notify(`Valeur du point (${row + 1}, ${col + 1})${coordinateSuffix} mise à jour.`, 'success');
        }

        const targetMachineId = machineId || this.lastMeshMachineId;
        if (targetMachineId) {
            this.persistMeshAfterPointRefresh(targetMachineId);
        }

        this.pointRefreshState = null;
    }

    async persistMeshAfterPointRefresh(machineId) {
        try {
            if (typeof MachineManager === 'undefined') {
                throw new Error('Gestionnaire de machines indisponible.');
            }

            if (typeof window.machineManager === 'undefined') {
                window.machineManager = new MachineManager();
                await window.machineManager.loadMachinesFromDB();
            }

            const machineManager = window.machineManager;
            let machine = machineManager.machines.get(machineId);

            if (!machine) {
                await machineManager.loadMachinesFromDB();
                machine = machineManager.machines.get(machineId);
            }

            if (!machine) {
                throw new Error('Machine introuvable pour la sauvegarde du mesh.');
            }

            const supportsSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
            if (!machine.isConnected) {
                if (!supportsSerial) {
                    throw new Error('Connexion série indisponible pour sauvegarder le mesh.');
                }

                const authorizedPorts = await navigator.serial.getPorts();
                if (authorizedPorts.length > 0) {
                    await machineManager.connectExistingMachine(machineId);
                } else {
                    await machineManager.authorizeAndConnect(machineId);
                }
                machine = machineManager.machines.get(machineId);
            }

            if (!machine || !machine.isConnected || !machine.port) {
                throw new Error('Impossible d\'accéder au port de la machine pour la sauvegarde du mesh.');
            }

            const commands = ['G29 S1', 'M500'];
            const encoder = new TextEncoder();

            for (const command of commands) {
                let writer;
                try {
                    writer = machine.port.writable.getWriter();
                    await writer.write(encoder.encode(`${command}\n`));
                } finally {
                    writer?.releaseLock();
                }

                await this.delay(150);
            }

            this.notify('Mesh sauvegardé dans le slot 1 et enregistré dans l\'EEPROM.', 'success');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du mesh:', error);
            this.notify('Valeur mise à jour, mais la sauvegarde sur la machine a échoué.', 'warning');
        }
    }

    delay(ms) {
        const safeDelay = Number.isFinite(ms) && ms > 0 ? ms : 0;
        return new Promise((resolve) => {
            setTimeout(resolve, safeDelay);
        });
    }

    /**
     * Vérifie si la réponse est complète dans le buffer et importe automatiquement
     */
    checkAndImportFromBuffer() {
        if (this.pointRefreshState) {
            return;
        }

        if (!this.machineDataBuffer) return;
        
        const lines = this.machineDataBuffer.split('\n');
        
        // Vérifier si on a le pattern de fin (ok ou coordonnées finales)
        const hasEndPattern = this.machineDataBuffer.includes('ok') || 
                             this.machineDataBuffer.match(/\([^)]*\)\s*\([^)]*\)/);
        
        // Vérifier qu'on a des données mesh (lignes avec | et valeurs)
        const hasMeshData = lines.some(line => 
            line.includes('|') && 
            line.match(/^\d+\s*\|/) && 
            line.match(/[+-]?[\d.]+/)
        );
        
        // Si on a les données et la fin, et qu'on n'a pas déjà importé
        if (hasEndPattern && hasMeshData && !this.autoImportDone) {
            // Attendre un peu pour être sûr que tout est arrivé
            clearTimeout(this.importTimeout);
            this.importTimeout = setTimeout(() => {
                this.importFromBuffer();
            }, 1000);
        }
    }
    
    /**
     * Importe les données depuis le buffer
     */
    importFromBuffer() {
        if (!this.machineDataBuffer) {
            console.log('Pas de buffer disponible');
            return;
        }
        
        // Marquer qu'on a déjà tenté l'import
        if (this.autoImportDone) {
            console.log('Import déjà effectué');
            return;
        }
        this.autoImportDone = true;
        
        console.log('Tentative d\'import depuis buffer:', this.machineDataBuffer.length, 'caractères');
        console.log('Contenu du buffer:', this.machineDataBuffer.substring(0, 500));

        // Parser les données
        const meshData = this.parseMeshData(this.machineDataBuffer);
        if (!meshData) {
            console.log('Échec du parsing, réessai autorisé');
            if (this.pointRefreshState) {
                this.failPointRefresh('Impossible d\'interpréter la réponse de la machine pour ce point.');
            } else {
                this.autoImportDone = false; // Réessayer si le parsing échoue
            }
            return;
        }

        console.log('Données parsées avec succès:', {
            rows: meshData.rows,
            cols: meshData.cols,
            totalValues: meshData.totalValues,
            missingCount: meshData.missingCount
        });

        const isPointRefresh = !!(this.pointRefreshState && (this.pointRefreshState.status === 'awaiting-data' || this.pointRefreshState.status === 'loading'));

        // Importer les données
        this.meshData = meshData;
        this.markMeshDataDirty();
        this.renderMatrix(meshData);

        if (this.currentMeshMachineId !== null && this.currentMeshMachineId !== undefined) {
            this.lastMeshMachineId = this.currentMeshMachineId;
        }

        // Nettoyer le buffer
        this.machineDataBuffer = null;

        // Fermer le modal
        this.closeMachineSelection();

        // Afficher une notification
        if (isPointRefresh) {
            if (this.pointRefreshState) {
                this.pointRefreshState.cell = null;
                this.pointRefreshState.button = null;
                this.pointRefreshState.originalContent = null;
            }
        } else {
            this.notify(`Mesh importé: ${meshData.rows}x${meshData.cols} (${meshData.totalValues} valeurs)`, 'success');
        }
    }
    
    /**
     * Connecte une machine et importe les données
     */
    async connectAndImportFromMachine(machineData, event) {
        const meshCommandInput = document.getElementById('meshCommand');
        const meshCommand = meshCommandInput ? meshCommandInput.value.trim() : 'G29 T';

        if (!meshCommand) {
            this.notify('Veuillez saisir une commande de récupération.', 'error');
            return;
        }

        this.lastMeshMachineUuid = machineData?.uuid || null;

        const supportsSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
        if (!supportsSerial) {
            this.notify('La connexion série n\'est pas disponible sur ce navigateur.', 'error');
            return;
        }

        const btn = event?.target || document.querySelector(`button[data-machine-uuid="${machineData.uuid}"]`);
        let originalText;
        if (btn) {
            btn.disabled = true;
            originalText = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
        }

        try {
            if (typeof MachineManager === 'undefined') {
                throw new Error('Le gestionnaire de machines n'est pas disponible. Veuillez recharger la page.');
            }

            if (typeof window.machineManager === 'undefined') {
                window.machineManager = new MachineManager();
                await window.machineManager.loadMachinesFromDB();
            }

            let machine = null;
            let machineId = null;

            for (const [id, m] of window.machineManager.machines.entries()) {
                if (m.uuid === machineData.uuid) {
                    machine = m;
                    machineId = id;
                    break;
                }
            }

            if (!machine) {
                await window.machineManager.loadMachinesFromDB();
                for (const [id, m] of window.machineManager.machines.entries()) {
                    if (m.uuid === machineData.uuid) {
                        machine = m;
                        machineId = id;
                        break;
                    }
                }
            }

            if (!machine || !machineId) {
                throw new Error('Machine non trouvée dans le gestionnaire.');
            }

            if (!machine.isConnected) {
                const hasAuthorizedPorts = 'serial' in navigator && (await navigator.serial.getPorts()).length > 0;
                if (hasAuthorizedPorts) {
                    await window.machineManager.connectExistingMachine(machineId);
                } else {
                    await window.machineManager.authorizeAndConnect(machineId);
                }
                machine = window.machineManager.machines.get(machineId);
            }

            if (!machine || !machine.isConnected || !machine.port) {
                throw new Error('Impossible de connecter la machine. Veuillez vérifier la connexion série.');
            }

            if (!window.machineManager.readers.has(machineId)) {
                window.machineManager.startReadingSerial(machineId);
            }

            this.autoImportDone = false;
            this.machineDataBuffer = '';
            this.currentMeshMachineId = machineId;

            if (typeof this.serialUnsubscribe === 'function') {
                this.serialUnsubscribe();
                this.serialUnsubscribe = null;
            }

            this.serialUnsubscribe = window.machineManager.addSerialListener(({ machineId: emittedId, data }) => {
                if (emittedId === machineId && this.currentMeshMachineId === machineId) {
                    this.collectMachineData(`${data}\n`);
                }
            });

            const encoder = new TextEncoder();
            let writer = null;
            try {
                writer = machine.port.writable.getWriter();
                await writer.write(encoder.encode(`${meshCommand}\n`));
            } finally {
                writer?.releaseLock();
            }

            this.collectMachineData(`> ${meshCommand}\n`);
        } catch (error) {
            console.error('Erreur lors de l'import depuis la machine:', error);
            const message = error.message || 'Erreur lors de l'import.';
            this.notify(message, 'error');
            if (typeof this.serialUnsubscribe === 'function') {
                this.serialUnsubscribe();
                this.serialUnsubscribe = null;
            }
            if (this.importTimeout) {
                clearTimeout(this.importTimeout);
                this.importTimeout = null;
            }
            this.currentMeshMachineId = null;
            this.autoImportDone = false;
            this.machineDataBuffer = null;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    }

    /**
     * Lit la réponse de la machine après l'envoi de G29 T
     */
    async readMachineResponse(machine) {
        return new Promise(async (resolve, reject) => {
            const decoder = new TextDecoder();
            let buffer = '';
            let timeoutId;
            let responseComplete = false;
            let reader = null;
            let lastDataTime = Date.now();
            let inactivityInterval = null;
            
            // Timeout de 30 secondes
            timeoutId = setTimeout(() => {
                if (!responseComplete && reader) {
                    if (inactivityInterval) clearInterval(inactivityInterval);
                    reader.releaseLock();
                    reject(new Error('Timeout: Aucune réponse reçue dans les 30 secondes'));
                }
            }, 30000);
            
            try {
                // Vérifier si un reader existe déjà
                reader = window.machineManager.readers.get(machine.id);
                const isExistingReader = !!reader;
                
                if (!reader) {
                    // Créer un nouveau reader temporaire
                    reader = machine.port.readable.getReader();
                }
                
                const checkComplete = () => {
                    const lines = buffer.split('\n');
                    
                    // Vérifier si on a reçu suffisamment de lignes
                    if (lines.length < 15) {
                        return false; // Attendre plus de données
                    }
                    
                    // Chercher le pattern de fin "ok" (case insensitive)
                    const hasOk = lines.some(line => 
                        line.trim().toLowerCase() === 'ok'
                    );
                    
                    // Chercher les coordonnées finales (pattern de fin) - format ( 1, 1) (299, 1)
                    const hasEndPattern = lines.some(line => {
                        const trimmed = line.trim();
                        return trimmed.match(/^\([^)]*\)\s*\([^)]*\)$/) && 
                               (trimmed.includes('( 1,') || trimmed.includes('( 1, 1)'));
                    });
                    
                    // Compter les lignes avec données mesh (format "Y | ...")
                    const meshDataLines = lines.filter(line => {
                        const trimmed = line.trim();
                        return trimmed.includes('|') && 
                               trimmed.match(/^\d+\s*\|/) &&
                               trimmed.match(/[+-]?[\d.]+/);
                    }).length;
                    
                    // Vérifier si on a assez de lignes de données (au moins 9 lignes pour un mesh 10x10)
                    const hasEnoughData = meshDataLines >= 9;
                    
                    // Vérifier aussi si les dernières lignes suggèrent la fin
                    const lastFew = lines.slice(-8);
                    const hasEnding = lastFew.some(line => {
                        const trimmed = line.trim().toLowerCase();
                        return trimmed === 'ok' || 
                               trimmed.match(/^\([^)]*\)\s*\([^)]*\)$/) ||
                               (trimmed.match(/^\([^)]*\)$/) && trimmed.includes('( 1'));
                    });
                    
                    // La réponse est complète si:
                    // 1. On a "ok" ET assez de données
                    // 2. OU on a le pattern de fin ET assez de données
                    // 3. OU on a assez de données ET les dernières lignes suggèrent la fin
                    if ((hasOk && hasEnoughData) || 
                        (hasEndPattern && hasEnoughData) ||
                        (hasEnoughData && hasEnding && meshDataLines >= 9)) {
                        return true;
                    }
                    
                    return false;
                };
                
                // Démarrer le check d'inactivité - augmenter le délai pour attendre plus de données
                inactivityInterval = setInterval(() => {
                    if (!responseComplete && Date.now() - lastDataTime > 5000 && buffer.length > 200) {
                        // Vérifier si on a au moins quelques lignes de données
                        const lines = buffer.split('\n');
                        const meshDataLines = lines.filter(line => {
                            const trimmed = line.trim();
                            return trimmed.includes('|') && 
                                   trimmed.match(/^\d+\s*\|/) &&
                                   trimmed.match(/[+-]?[\d.]+/);
                        }).length;
                        
                        // Si on a au moins quelques lignes de données, considérer que c'est complet
                        // Mais vérifier aussi si on a le pattern "ok" qui indique vraiment la fin
                        const hasOk = buffer.toLowerCase().includes('\nok\n') || 
                                     buffer.toLowerCase().trim().endsWith('ok');
                        
                        if (meshDataLines >= 3 && (hasOk || buffer.length > 500)) {
                            clearInterval(inactivityInterval);
                            responseComplete = true;
                            clearTimeout(timeoutId);
                            resolve(buffer);
                        }
                    }
                }, 500);
                
                const readLoop = async () => {
                    try {
                        while (!responseComplete) {
                            const { value, done } = await reader.read();
                            
                            if (done) {
                                responseComplete = true;
                                if (inactivityInterval) clearInterval(inactivityInterval);
                                clearTimeout(timeoutId);
                                resolve(buffer);
                                break;
                            }
                            
                            // Décoder les données
                            if (value && value.length > 0) {
                                buffer += decoder.decode(value, { stream: true });
                                lastDataTime = Date.now();
                                
                                                // Vérifier si la réponse est complète
                                if (checkComplete()) {
                                    // Attendre plus longtemps pour être sûr d'avoir tout
                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                    
                                    // Essayer de lire plusieurs fois avec timeout court
                                    try {
                                        for (let i = 0; i < 5; i++) {
                                            const readPromise = reader.read();
                                            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 500));
                                            const result = await Promise.race([readPromise, timeoutPromise]);
                                            
                                            if (result && !result.done && result.value && result.value.length > 0) {
                                                buffer += decoder.decode(result.value, { stream: true });
                                                lastDataTime = Date.now();
                                                
                                                // Re-vérifier après chaque lecture supplémentaire
                                                if (checkComplete()) {
                                                    await new Promise(resolve => setTimeout(resolve, 500));
                                                }
                                            } else {
                                                break; // Plus de données
                                            }
                                        }
                                    } catch (e) {
                                        // Pas de données supplémentaires ou timeout
                                    }
                                    
                                    responseComplete = true;
                                    if (inactivityInterval) clearInterval(inactivityInterval);
                                    clearTimeout(timeoutId);
                                    resolve(buffer);
                                    break;
                                }
                            }
                        }
                    } catch (error) {
                        if (!responseComplete) {
                            responseComplete = true;
                            if (inactivityInterval) clearInterval(inactivityInterval);
                            clearTimeout(timeoutId);
                            reject(error);
                        }
                    } finally {
                        // Nettoyer
                        if (inactivityInterval) clearInterval(inactivityInterval);
                        // Ne libérer le reader que si on l'a créé nous-mêmes
                        if (!isExistingReader && reader) {
                            try {
                                reader.releaseLock();
                            } catch (e) {
                                // Reader déjà libéré
                            }
                        }
                    }
                };
                
                readLoop();
            } catch (error) {
                if (inactivityInterval) clearInterval(inactivityInterval);
                clearTimeout(timeoutId);
                if (reader && !window.machineManager.readers.has(machine.id)) {
                    try {
                        reader.releaseLock();
                    } catch (e) {
                        // Ignorer
                    }
                }
                reject(error);
            }
        });
    }
    
    /**
     * Ouvre le modal des paramètres 3D
     */
    openMesh3DSettings() {
        const modal = document.getElementById('mesh3DSettingsModal');
        const mesh3DSmoothingLevel = document.getElementById('mesh3DSmoothingLevel');
        const mesh3DSmoothingValue = document.getElementById('mesh3DSmoothingValue');
        const mesh3DZScale = document.getElementById('mesh3DZScale');
        const mesh3DZScaleValue = document.getElementById('mesh3DZScaleValue');

        if (modal) {
            // Initialiser les valeurs actuelles
            if (mesh3DSmoothingLevel) {
                mesh3DSmoothingLevel.value = String(this.mesh3DSmoothingLevel);
                if (mesh3DSmoothingValue) {
                    mesh3DSmoothingValue.textContent = this.getMeshSmoothingLabel(this.mesh3DSmoothingLevel);
                }
            }
            if (mesh3DZScale && mesh3DZScaleValue) {
                mesh3DZScale.value = this.mesh3DZScale;
                mesh3DZScaleValue.textContent = this.mesh3DZScale.toFixed(1);
            }
            
            modal.classList.remove('hidden');
        }
    }
    
    /**
     * Ferme le modal des paramètres 3D
     */
    closeMesh3DSettings() {
        const modal = document.getElementById('mesh3DSettingsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Charge les préférences utilisateur pour la vue 3D
     */
    loadMesh3DPreferences() {
        if (typeof window === 'undefined' || !('localStorage' in window)) {
            return;
        }

        try {
            const stored = window.localStorage.getItem(this.mesh3DPreferencesKey);

            if (!stored) {
                return;
            }

            const parsed = JSON.parse(stored);

            if (parsed && typeof parsed === 'object') {
                if (Number.isInteger(parsed.smoothingLevel)) {
                    const maxLevel = this.mesh3DSmoothingLabels.length - 1;
                    this.mesh3DSmoothingLevel = Math.max(0, Math.min(maxLevel, parsed.smoothingLevel));
                }

                if (typeof parsed.zScale === 'number' && Number.isFinite(parsed.zScale)) {
                    this.mesh3DZScale = Math.max(0.5, Math.min(10, parsed.zScale));
                }
            }
            this.invalidateMesh3DCache();
        } catch (error) {
            console.warn('Impossible de charger les préférences 3D du mesh viewer', error);
        }
    }

    /**
     * Enregistre les préférences utilisateur pour la vue 3D
     */
    saveMesh3DPreferences() {
        if (typeof window === 'undefined' || !('localStorage' in window)) {
            return;
        }

        try {
            const payload = {
                smoothingLevel: this.mesh3DSmoothingLevel,
                zScale: this.mesh3DZScale
            };
            window.localStorage.setItem(this.mesh3DPreferencesKey, JSON.stringify(payload));
        } catch (error) {
            console.warn('Impossible d\'enregistrer les préférences 3D du mesh viewer', error);
        }
    }

    /**
     * Applique les paramètres 3D
     */
    applyMesh3DSettings() {
        const mesh3DSmoothingLevel = document.getElementById('mesh3DSmoothingLevel');
        const mesh3DZScale = document.getElementById('mesh3DZScale');

        if (mesh3DSmoothingLevel) {
            const level = parseInt(mesh3DSmoothingLevel.value, 10);
            if (!Number.isNaN(level)) {
                const maxLevel = this.mesh3DSmoothingLabels.length - 1;
                this.mesh3DSmoothingLevel = Math.max(0, Math.min(maxLevel, level));
            }
        }
        if (mesh3DZScale) {
            const zScale = parseFloat(mesh3DZScale.value);
            if (!Number.isNaN(zScale)) {
                this.mesh3DZScale = Math.max(0.5, Math.min(10, zScale));
            }
        }

        this.saveMesh3DPreferences();
        this.invalidateMesh3DCache();

        // Re-rendre le mesh avec les nouveaux paramètres
        if (this.meshData) {
            this.render3D(this.meshData);
        }
        
        // Fermer le modal
        this.closeMesh3DSettings();
    }
}

// Étendre MachineManager pour exposer getConnectedMachines
if (typeof MachineManager !== 'undefined') {
    MachineManager.prototype.getConnectedMachines = function() {
        const connected = [];
        this.machines.forEach((machine, id) => {
            if (machine.isConnected) {
                connected.push({ id, name: machine.name, baudRate: machine.baudRate });
            }
        });
        return connected;
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser MachineManager si ce n'est pas déjà fait (pour la page mesh-viewer)
    if (typeof MachineManager !== 'undefined' && typeof window.machineManager === 'undefined') {
        window.machineManager = new MachineManager();
    }
    
    new MeshViewer();
});

