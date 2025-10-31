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
        
        // Variables 3D
        this.scene3D = null;
        this.camera3D = null;
        this.renderer3D = null;
        this.controls3D = null;
        this.mesh3D = null;
        this.gridHelper = null;
        this.axesHelper = null;
        
        // Paramètres 3D
        this.mesh3DSmooth = true; // Lissage par défaut
        this.mesh3DZScale = 2.0; // Amplitude Z par défaut
        
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
        const mesh3DSmooth = document.getElementById('mesh3DSmooth');
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
        
        if (mesh3DSmooth) {
            mesh3DSmooth.checked = this.mesh3DSmooth;
            mesh3DSmooth.addEventListener('change', (e) => {
                mesh3DSmooth.checked = e.target.checked;
            });
        }
        
        if (mesh3DZScale && mesh3DZScaleValue) {
            mesh3DZScale.value = this.mesh3DZScale;
            mesh3DZScaleValue.textContent = this.mesh3DZScale.toFixed(1);
            mesh3DZScale.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                mesh3DZScaleValue.textContent = value.toFixed(1);
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
        
        const lines = text.trim().split('\n');
        const dataLines = [];
        
        // Trouver les lignes de données (celles qui contiennent des valeurs numériques avec + ou -)
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            // Ignorer les lignes vides
            if (line === '') {
                continue;
            }
            
            // Ignorer les lignes d'en-tête comme "Bed Topography Report:"
            if (line.toLowerCase().includes('bed topography') || line.toLowerCase().includes('report')) {
                continue;
            }
            
            // Ignorer les lignes de coordonnées (1,299) etc.
            if (line.match(/^\([^)]*\)\s*\([^)]*\)$/) || line.match(/^\([^)]*\)$/)) {
                continue;
            }
            
            // Ignorer les lignes "ok" ou autres messages de confirmation
            if (line.toLowerCase() === 'ok' || line.startsWith('>')) {
                continue;
            }
            
            // Ignorer les lignes de séparateurs ou de numéros de colonnes uniquement (sans pipe)
            if (line.match(/^[0-9\s]+$/) && !line.includes('|')) {
                continue;
            }
            
            // Ignorer les lignes avec uniquement "|"
            if (line === '|') {
                continue;
            }
            
            // Ligne de données : format "Y | value1 value2 ..." ou "Y | +0.188 +0.157 ..."
            // Peut aussi être une ligne de header avec des numéros de colonnes mêlés
            if (line.includes('|')) {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const rowIndexStr = parts[0].trim();
                    const rowIndex = parseInt(rowIndexStr);
                    
                    // Vérifier que c'est bien un numéro de ligne valide
                    // Ignorer les lignes qui ne commencent pas par un nombre suivi d'un pipe
                    if (isNaN(rowIndex) || !/^\d+\s*\|/.test(line.trim())) {
                        continue;
                    }
                    
                    // Extraire la partie après le pipe (enlever le | final si présent)
                    let valuesStr = parts[1].trim();
                    // Enlever le pipe final si présent
                    valuesStr = valuesStr.replace(/\|\s*$/, '').trim();
                    
                    // Extraire les valeurs (format: +0.188 ou [+0.143] ou +0.188 ou -0.015 ou 0.000 ou +0084 ou +0200 ou . pour manquant)
                    // Gérer aussi les cas où il n'y a pas de signe + ou - au début
                    // Normaliser les espaces multiples en un seul espace d'abord
                    const normalizedStr = valuesStr.replace(/\s+/g, ' ');
                    
                    // Parser les valeurs : chercher soit des nombres, soit des points
                    const values = [];
                    // Pattern pour trouver : un nombre (avec ou sans signe) OU un point (avec ou sans crochets)
                    const valuePattern = /(\[?\s*\.\s*\]?|[+-]?\d+\.?\d*)/g;
                    let match;
                    
                    while ((match = valuePattern.exec(normalizedStr)) !== null) {
                        let v = match[1].trim();
                        
                        // Détecter les points (.) qui indiquent une valeur manquante
                        if (v === '.' || v === '[.]' || v === '[ .' || v.match(/^\[?\s*\.\s*\]?$/)) {
                            values.push(null); // null pour valeur manquante
                            continue;
                        }
                        
                        // Enlever les crochets si présents
                        v = v.replace(/[\[\]]/g, '').trim();
                        
                        // Vérifier à nouveau après avoir enlevé les crochets
                        if (v === '.' || v === '') {
                            values.push(null); // null pour valeur manquante
                            continue;
                        }
                        
                        // Extraire le nombre avec gestion des cas spéciaux
                        let numMatch = v.match(/^([+-]?)(\d+)(\.\d+)?/);
                        if (!numMatch) {
                            // Essayer de trouver n'importe quel nombre
                            numMatch = v.match(/([+-]?\d+\.?\d*)/);
                        }
                        
                        if (numMatch) {
                            let numStr = numMatch[0];
                            // Corriger les formats comme +0084 en 0.084 ou +0200 en 0.200
                            if (/^[+-]?\d{4,}$/.test(numStr)) {
                                // C'est un nombre sans point décimal, probablement mal formaté
                                // Par exemple +0084 devrait être +0.084
                                const sign = numStr.startsWith('-') ? '-' : (numStr.startsWith('+') ? '+' : '');
                                const digits = numStr.replace(/^[+-]/, '');
                                if (digits.length >= 3) {
                                    // Prendre les 3 premiers chiffres comme la partie entière et décimale
                                    numStr = `${sign}${digits.slice(0, 1)}.${digits.slice(1, 3)}`;
                                }
                            }
                            
                            const num = parseFloat(numStr);
                            values.push(isNaN(num) ? null : num);
                        } else {
                            values.push(null);
                        }
                    }
                    
                    // On garde la ligne même si certaines valeurs sont null (manquantes)
                    // Cela permet de préserver la structure de la grille
                    // On vérifie qu'on a au moins une valeur ou des nulls (structure présente)
                    if (values.length > 0) {
                        dataLines.push({ row: rowIndex, values });
                    }
                }
            }
        }
        
        if (dataLines.length === 0) {
            return null;
        }
        
        // Trier par index de ligne (décroissant - la ligne 9 en haut, ligne 0 en bas)
        dataLines.sort((a, b) => b.row - a.row);
        
        // Déterminer la taille de la matrice (utiliser le nombre maximum de colonnes)
        const numRows = dataLines.length;
        
        // Compter les colonnes : utiliser le nombre le plus fréquent pour éviter les erreurs
        const colCounts = dataLines.map(line => line.values.length);
        // Si on a plusieurs tailles différentes, prendre la plus fréquente
        const colCountMap = {};
        colCounts.forEach(count => {
            colCountMap[count] = (colCountMap[count] || 0) + 1;
        });
        
        // Trouver la taille la plus fréquente
        let numCols = Math.max(...colCounts);
        let maxFreq = 0;
        for (const [count, freq] of Object.entries(colCountMap)) {
            if (freq > maxFreq) {
                maxFreq = freq;
                numCols = parseInt(count);
            }
        }
        
        console.log('Détection de la taille:', {
            rows: numRows,
            cols: numCols,
            colCounts: colCounts,
            colCountMap: colCountMap
        });
        
        // Créer la matrice et compter les valeurs manquantes
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
                    matrix[i].push(null); // null pour les valeurs manquantes
                    missingCount++;
                }
            }
        }
        
        return {
            matrix,
            rows: numRows,
            cols: numCols,
            missingCount,
            totalValues
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
                const cell = document.createElement('div');
                cell.className = 'mesh-cell editable';
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.dataset.value = value !== null ? value : '';
                
                if (value === null) {
                    // Valeur manquante : fond gris et tiret
                    cell.style.backgroundColor = '#9ca3af'; // gray-400
                    cell.style.color = '#ffffff';
                    cell.style.fontWeight = '500';
                    cell.textContent = '-';
                } else {
                    // Valeur présente : couleur heatmap
                    cell.style.backgroundColor = this.getHeatmapColor(value, stats.min, stats.max);
                    // Ajuster la couleur du texte selon la luminosité de fond
                    const rgb = this.hexToRgb(cell.style.backgroundColor);
                    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                    cell.style.color = brightness > 128 ? '#000000' : '#ffffff';
                    cell.style.fontWeight = '500';
                    cell.textContent = value >= 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
                }
                
                // Rendre la cellule éditable
                cell.addEventListener('click', () => this.editCell(cell, i, j));
                
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
        this.renderer3D.setPixelRatio(window.devicePixelRatio);
        
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
        
        // Animation loop
        let animationId = null;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            if (this.controls3D) {
                this.controls3D.update();
            }
            if (this.renderer3D && this.scene3D && this.camera3D) {
                this.renderer3D.render(this.scene3D, this.camera3D);
            }
        };
        
        // Stocker l'ID de l'animation pour pouvoir l'arrêter si nécessaire
        this.animationId = requestAnimationFrame(animate);
        
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
            }
        };
        window.addEventListener('resize', handleResize);
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
        
        const { matrix, rows, cols } = meshData;
        const stats = this.calculateStats(matrix);
        
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
                const value = matrix[i][j];
                
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
            flatShading: !this.mesh3DSmooth // Lissage selon le paramètre
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
                
                // Recalculer les statistiques
                const stats = this.calculateStats(this.meshData.matrix);
                this.minValue = stats.min;
                this.maxValue = stats.max;
                
                // Recréer la cellule avec valeur manquante
                const newCell = document.createElement('div');
                newCell.className = 'mesh-cell editable';
                newCell.dataset.row = row;
                newCell.dataset.col = col;
                newCell.dataset.value = '';
                newCell.style.backgroundColor = '#9ca3af'; // gray-400
                newCell.style.color = '#ffffff';
                newCell.style.fontWeight = '500';
                newCell.textContent = '-';
                newCell.addEventListener('click', () => this.editCell(newCell, row, col));
                
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
                    
                    // Recalculer les statistiques
                    const stats = this.calculateStats(this.meshData.matrix);
                    this.minValue = stats.min;
                    this.maxValue = stats.max;
                    
                    // Recréer la cellule avec la nouvelle valeur
                    const newCell = document.createElement('div');
                    newCell.className = 'mesh-cell editable';
                    newCell.dataset.row = row;
                    newCell.dataset.col = col;
                    newCell.dataset.value = newValue;
                    const bgColor = this.getHeatmapColor(newValue, stats.min, stats.max);
                    newCell.style.backgroundColor = bgColor;
                    // Ajuster la couleur du texte selon la luminosité de fond
                    const rgb = this.hexToRgb(bgColor);
                    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                    newCell.style.color = brightness > 128 ? '#000000' : '#ffffff';
                    newCell.style.fontWeight = '500';
                    newCell.textContent = newValue >= 0 ? `+${newValue.toFixed(3)}` : newValue.toFixed(3);
                    newCell.addEventListener('click', () => this.editCell(newCell, row, col));
                    
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
        cells.forEach(cell => {
            const valueStr = cell.dataset.value;
            if (valueStr === '' || valueStr === null || valueStr === undefined) {
                // Valeur manquante : garder le fond gris et le tiret
                cell.style.backgroundColor = '#9ca3af'; // gray-400
                cell.style.color = '#ffffff';
                cell.textContent = '-';
            } else {
                const value = parseFloat(valueStr);
                if (!isNaN(value)) {
                    const bgColor = this.getHeatmapColor(value, min, max);
                    cell.style.backgroundColor = bgColor;
                    // Ajuster la couleur du texte selon la luminosité de fond
                    const rgb = this.hexToRgb(bgColor);
                    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                    cell.style.color = brightness > 128 ? '#000000' : '#ffffff';
                    cell.textContent = value >= 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
                }
            }
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
            alert('Veuillez coller des données mesh');
            return;
        }
        
        const meshData = this.parseMeshData(text);
        if (!meshData) {
            alert('Format de données invalide. Veuillez vérifier le format.');
            return;
        }
        
        this.meshData = meshData;
        this.renderMatrix(meshData);
        
        // Fermer le modal après import réussi
        this.closeImportModal();
        
        // Masquer les infos de détection
        const importInfo = document.getElementById('importInfo');
        if (importInfo) {
            importInfo.classList.add('hidden');
        }
    }
    
    /**
     * Affiche le modal de sélection de machine
     */
    async showMachineSelection() {
        const machineSelectModal = document.getElementById('machineSelectModal');
        const machineList = document.getElementById('machineList');
        
        if (!machineSelectModal || !machineList) return;
        
        machineSelectModal.classList.remove('hidden');
        machineList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">Chargement des machines...</p>';
        
        try {
            // Récupérer les machines depuis la BDD
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
            
            if (machines.length === 0) {
                machineList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">Aucune machine enregistrée. Veuillez ajouter une machine depuis le dashboard.</p>';
                return;
            }
            
            // Obtenir l'état des machines connectées si MachineManager est disponible
            let connectedMachineIds = new Set();
            if (typeof window.machineManager !== 'undefined') {
                connectedMachineIds = new Set(
                    Array.from(window.machineManager.machines.values())
                        .filter(m => m.isConnected)
                        .map(m => m.uuid)
                );
            }
            
            // Afficher la liste des machines
            machineList.innerHTML = machines.map(machine => {
                const isConnected = connectedMachineIds.has(machine.uuid);
                return `
                    <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 mb-2">
                        <div class="flex-1">
                            <div class="font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                                <span>${machine.name || 'Machine sans nom'}</span>
                                ${isConnected ? '<span class="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">Connectée</span>' : ''}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ${machine.baud_rate || 115200} baud${machine.last_port ? ` • ${machine.last_port}` : ''}
                            </div>
                        </div>
                        <button 
                            class="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            data-machine-uuid="${machine.uuid}"
                            data-machine-name="${machine.name || 'Machine'}"
                            data-machine-baud="${machine.baud_rate || 115200}"
                            data-machine-port="${machine.last_port || ''}"
                            ${isConnected ? '' : ''}
                        >
                            Connecter
                        </button>
                    </div>
                `;
            }).join('');
            
            // Ajouter les event listeners
            machineList.querySelectorAll('button[data-machine-uuid]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const machineData = {
                        uuid: btn.dataset.machineUuid,
                        name: btn.dataset.machineName,
                        baudRate: parseInt(btn.dataset.machineBaud),
                        port: btn.dataset.machinePort
                    };
                    await this.connectAndImportFromMachine(machineData, e);
                });
            });
            
        } catch (error) {
            console.error('Erreur lors du chargement des machines:', error);
            machineList.innerHTML = `<p class="text-red-600 dark:text-red-400 text-sm">Erreur: ${error.message}</p>`;
        }
    }
    
    /**
     * Ferme le modal de sélection de machine
     */
    closeMachineSelection() {
        const machineSelectModal = document.getElementById('machineSelectModal');
        if (machineSelectModal) {
            machineSelectModal.classList.add('hidden');
        }
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
        
        // Vérifier si la réponse est complète
        this.checkAndImportFromBuffer();
    }
    
    /**
     * Vérifie si la réponse est complète dans le buffer et importe automatiquement
     */
    checkAndImportFromBuffer() {
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
            this.autoImportDone = false; // Réessayer si le parsing échoue
            return;
        }
        
        console.log('Données parsées avec succès:', {
            rows: meshData.rows,
            cols: meshData.cols,
            totalValues: meshData.totalValues,
            missingCount: meshData.missingCount
        });
        
        // Importer les données
        this.meshData = meshData;
        this.renderMatrix(meshData);
        
        // Nettoyer le buffer
        this.machineDataBuffer = null;
        
        // Fermer le modal
        this.closeMachineSelection();
        
        // Afficher une notification
        if (typeof notificationManager !== 'undefined') {
            notificationManager.show(`Mesh importé: ${meshData.rows}x${meshData.cols} (${meshData.totalValues} valeurs)`, 'success');
        }
    }
    
    /**
     * Connecte une machine et importe les données
     */
    async connectAndImportFromMachine(machineData, event) {
        const meshCommandInput = document.getElementById('meshCommand');
        const meshCommand = meshCommandInput ? meshCommandInput.value.trim() : 'G29 T';
        
        if (!meshCommand) {
            alert('Veuillez saisir une commande de récupération.');
            return;
        }
        
        // Désactiver le bouton
        const btn = event?.target || document.querySelector(`button[data-machine-uuid="${machineData.uuid}"]`);
        if (btn) {
            btn.disabled = true;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
        try {
            // Initialiser notificationManager si nécessaire
            if (typeof notificationManager === 'undefined' && typeof window.notificationManager === 'undefined') {
                console.warn('NotificationManager non disponible - certaines notifications peuvent ne pas s\'afficher');
            }
            
            // Initialiser MachineManager si nécessaire
            if (typeof MachineManager === 'undefined') {
                alert('Le gestionnaire de machines n\'est pas disponible. Veuillez recharger la page.');
                return;
            }
            
            if (typeof window.machineManager === 'undefined') {
                window.machineManager = new MachineManager();
                // Charger les machines depuis la BDD
                await window.machineManager.loadMachinesFromDB();
            }
                
                // Chercher la machine dans le MachineManager par UUID
                let machine = null;
                let machineId = null;
                
                for (const [id, m] of window.machineManager.machines.entries()) {
                    if (m.uuid === machineData.uuid) {
                        machine = m;
                        machineId = id;
                        break;
                    }
                }
                
                // Si la machine n'existe pas dans le MachineManager, la charger
                if (!machine) {
                    // Charger les machines depuis la BDD
                    await window.machineManager.loadMachinesFromDB();
                    
                    // Rechercher la machine
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
                
                // Si la machine n'est pas connectée, la connecter
                if (!machine.isConnected) {
                    // Vérifier si des ports sont déjà autorisés
                    let hasAuthorizedPorts = false;
                    try {
                        if ('serial' in navigator) {
                            const ports = await navigator.serial.getPorts();
                            hasAuthorizedPorts = ports.length > 0;
                        }
                    } catch (e) {
                        // Ignorer
                    }
                    
                    if (hasAuthorizedPorts) {
                        // Essayer de se connecter avec un port existant
                        await window.machineManager.connectExistingMachine(machineId);
                        // Attendre la connexion
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        // Demander l'autorisation
                        await window.machineManager.authorizeAndConnect(machineId);
                        // Attendre la connexion
                        await new Promise(resolve => setTimeout(resolve, 4000));
                    }
                    
                    // Vérifier la connexion
                    machine = window.machineManager.machines.get(machineId);
                }
                
                if (!machine || !machine.isConnected || !machine.port) {
                    throw new Error('Impossible de connecter la machine. Veuillez vérifier la connexion série.');
                }
                
                // Réinitialiser le flag d'import automatique et le buffer
                this.autoImportDone = false;
                this.machineDataBuffer = '';
                this.currentMeshMachineId = machineId; // Stocker l'ID de la machine pour le mesh
                
                console.log('Initialisation de la collecte de données pour machine:', machineId);
                
                // Intercepter appendToConsole AVANT de démarrer la lecture
                const originalAppendToConsole = window.machineManager.appendToConsole.bind(window.machineManager);
                window.machineManager.appendToConsole = (text, colorClass) => {
                    // Toujours collecter les données si c'est notre machine
                    if (this.currentMeshMachineId === machineId) {
                        this.collectMachineData(text + '\n');
                    }
                    // Appeler l'original aussi
                    originalAppendToConsole(text, colorClass);
                };
                
                // Définir currentConsoleMachine pour que startReadingSerial envoie les données à appendToConsole
                window.machineManager.currentConsoleMachine = machineId;
                
                // Démarrer la lecture continue si elle n'existe pas déjà
                if (!window.machineManager.readers.has(machineId)) {
                    console.log('Démarrage de startReadingSerial');
                    window.machineManager.startReadingSerial(machineId);
                    // Attendre un peu que le reader soit initialisé
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.log('Reader déjà existant pour cette machine');
                }
                
                // Envoyer la commande
                const encoder = new TextEncoder();
                const writer = machine.port.writable.getWriter();
                await writer.write(encoder.encode(`${meshCommand}\n`));
                writer.releaseLock();
                
                // Collecter aussi la commande envoyée
                this.collectMachineData(`> ${meshCommand}\n`);
                
                console.log('Commande envoyée:', meshCommand);
                console.log('En attente de la réponse...');
                
                // Les données arriveront automatiquement via startReadingSerial qui appelle appendToConsole
                // L'import automatique se fera quand la réponse sera complète
                
            } catch (error) {
                console.error('Erreur lors de l\'import depuis la machine:', error);
                if (typeof notificationManager !== 'undefined') {
                    notificationManager.show(`Erreur lors de l'import: ${error.message}`, 'error');
                } else {
                    alert(`Erreur lors de l'import: ${error.message}`);
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
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
        const mesh3DSmooth = document.getElementById('mesh3DSmooth');
        const mesh3DZScale = document.getElementById('mesh3DZScale');
        const mesh3DZScaleValue = document.getElementById('mesh3DZScaleValue');
        
        if (modal) {
            // Initialiser les valeurs actuelles
            if (mesh3DSmooth) {
                mesh3DSmooth.checked = this.mesh3DSmooth;
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
     * Applique les paramètres 3D
     */
    applyMesh3DSettings() {
        const mesh3DSmooth = document.getElementById('mesh3DSmooth');
        const mesh3DZScale = document.getElementById('mesh3DZScale');
        
        if (mesh3DSmooth) {
            this.mesh3DSmooth = mesh3DSmooth.checked;
        }
        if (mesh3DZScale) {
            this.mesh3DZScale = parseFloat(mesh3DZScale.value);
        }
        
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

