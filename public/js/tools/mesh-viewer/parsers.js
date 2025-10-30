/**
 * Fonctions de parsing pour importer différents formats de maillage
 */
const MeshParsers = {
    parse(text, options = {}) {
        const trimmed = text.trim();
        if (!trimmed.length) {
            throw new Error('Le fichier est vide.');
        }

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return MeshParsers.parseJson(trimmed, options);
        }

        return MeshParsers.parseDelimited(trimmed, options);
    },

    parseJson(text) {
        try {
            const payload = JSON.parse(text);
            if (Array.isArray(payload)) {
                return MeshParsers.matrixFromArray(payload, { source: 'json-array' });
            }

            if (payload && typeof payload === 'object') {
                if (Array.isArray(payload.values) && Number.isInteger(payload.rows) && Number.isInteger(payload.cols)) {
                    const { rows, cols, values, mask = [], metadata = {} } = payload;
                    if (values.length !== rows * cols) {
                        throw new Error('Le tableau values ne correspond pas aux dimensions indiquées.');
                    }

                    const matrix = [];
                    for (let r = 0; r < rows; r++) {
                        const row = [];
                        for (let c = 0; c < cols; c++) {
                            const index = r * cols + c;
                            const value = values[index];
                            row.push(value === null ? NaN : Number(value));
                        }
                        matrix.push(row);
                    }

                    const maskMatrix = mask.length === rows * cols ? mask.slice() : null;
                    return {
                        matrix,
                        mask: maskMatrix,
                        metadata: {
                            ...metadata,
                            source: metadata.source || 'json-object'
                        }
                    };
                }

                if (Array.isArray(payload.matrix)) {
                    return MeshParsers.matrixFromArray(payload.matrix, {
                        source: payload.source || 'json-matrix',
                        metadata: payload.metadata || {}
                    });
                }
            }

            throw new Error('Format JSON non reconnu pour le maillage.');
        } catch (error) {
            throw new Error(`Impossible de parser le JSON: ${error.message}`);
        }
    },

    parseDelimited(text, options = {}) {
        const lines = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length && !line.startsWith('#') && !line.startsWith('//'));

        const matrix = [];
        let cols = null;

        for (const line of lines) {
            const parts = line.includes(',') ? line.split(',') : line.split(/[\s;\t\|]+/);
            const values = parts
                .map(value => value.trim())
                .filter(value => value.length)
                .map(value => {
                    if (value.toLowerCase() === 'nan' || value === '-') {
                        return NaN;
                    }
                    const num = Number(value.replace(',', '.'));
                    return Number.isFinite(num) ? num : NaN;
                });

            if (!values.length) {
                continue;
            }

            if (cols === null) {
                cols = values.length;
            } else if (values.length !== cols) {
                throw new Error('Les lignes du maillage doivent avoir la même longueur.');
            }

            matrix.push(values);
        }

        if (!matrix.length) {
            throw new Error('Aucune donnée valide détectée dans le fichier.');
        }

        return MeshParsers.matrixFromArray(matrix, { source: options.source || 'delimited' });
    },

    parsePronterface(text, options = {}) {
        const lines = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length);

        const dataLines = [];
        for (const line of lines) {
            const columns = line.split('|').map(col => col.trim());
            const numericColumns = columns
                .map(col => col.replace(/[\s]+/g, ' ').trim())
                .map(col => col.replace(/^(?:G29|G81)\s*/i, ''))
                .map(col => col.replace(/[XYZ]:?/gi, ''))
                .join(' ')
                .trim();

            const values = numericColumns
                .split(/\s+/)
                .map(value => value.replace(',', '.'))
                .map(value => {
                    if (!value.length) return null;
                    if (value === '---' || value.toLowerCase() === 'nan') return NaN;
                    const num = Number(value);
                    return Number.isFinite(num) ? num : NaN;
                })
                .filter(value => value !== null);

            if (values.length) {
                dataLines.push(values);
            }
        }

        if (!dataLines.length) {
            throw new Error("Impossible d'interpréter le rapport Pronterface.");
        }

        const matrix = options.transpose
            ? MeshParsers.transpose(dataLines)
            : dataLines;

        return MeshParsers.matrixFromArray(matrix, { source: 'pronterface' });
    },

    matrixFromArray(matrix, options = {}) {
        if (!Array.isArray(matrix) || !matrix.length) {
            throw new Error('Le maillage doit être un tableau 2D non vide.');
        }

        const rows = matrix.length;
        const cols = matrix[0].length;
        const normalized = [];
        const mask = [];

        for (let r = 0; r < rows; r++) {
            const row = matrix[r];
            if (!Array.isArray(row) || row.length !== cols) {
                throw new Error('Le maillage doit être rectangulaire.');
            }

            const normalizedRow = [];
            for (let c = 0; c < cols; c++) {
                const rawValue = row[c];
                const value = rawValue === null || rawValue === '' ? NaN : Number(rawValue);
                const index = r * cols + c;

                if (!Number.isFinite(value)) {
                    normalizedRow.push(NaN);
                    mask[index] = 1;
                } else {
                    normalizedRow.push(value);
                    mask[index] = 0;
                }
            }
            normalized.push(normalizedRow);
        }

        return {
            matrix: normalized,
            mask,
            metadata: {
                source: options.source || 'import',
                ...(options.metadata || {})
            }
        };
    },

    transpose(matrix) {
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;
        const result = Array.from({ length: cols }, () => Array(rows).fill(NaN));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                result[c][r] = matrix[r][c];
            }
        }
        return result;
    }
};

window.MeshParsers = MeshParsers;
