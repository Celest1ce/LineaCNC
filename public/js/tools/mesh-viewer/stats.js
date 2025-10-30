/**
 * Calculs statistiques pour le Mesh Viewer
 */
const MeshStats = {
    compute(values, mask) {
        const valid = [];
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let sum = 0;
        let count = 0;
        let missing = 0;
        let imputed = 0;

        for (let i = 0; i < values.length; i++) {
            const state = mask ? mask[i] : 0;
            if (state === 1) {
                missing++;
                continue;
            }

            if (!Number.isFinite(values[i])) {
                missing++;
                continue;
            }

            if (state === 2) {
                imputed++;
            }

            const v = values[i];
            valid.push(v);
            min = Math.min(min, v);
            max = Math.max(max, v);
            sum += v;
            count++;
        }

        const mean = count > 0 ? sum / count : NaN;
        const median = MeshStats.median(valid);
        const variance = MeshStats.variance(valid, mean);
        const std = Number.isFinite(variance) ? Math.sqrt(variance) : NaN;

        return {
            min: Number.isFinite(min) ? min : NaN,
            max: Number.isFinite(max) ? max : NaN,
            mean,
            median,
            std,
            missing,
            imputed,
            count
        };
    },

    median(arr) {
        if (!arr.length) return NaN;
        const copy = arr.slice().sort((a, b) => a - b);
        const mid = Math.floor(copy.length / 2);
        if (copy.length % 2 === 0) {
            return (copy[mid - 1] + copy[mid]) / 2;
        }
        return copy[mid];
    },

    variance(arr, mean) {
        if (!arr.length || !Number.isFinite(mean)) return NaN;
        let sum = 0;
        for (const value of arr) {
            sum += Math.pow(value - mean, 2);
        }
        return sum / arr.length;
    },

    format(value, options = {}) {
        const { digits = 3 } = options;
        if (!Number.isFinite(value)) {
            return '-';
        }
        return Number(value).toFixed(digits);
    }
};

window.MeshStats = MeshStats;
