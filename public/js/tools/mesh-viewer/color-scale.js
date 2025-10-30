/**
 * Gestion des palettes colorimétriques pour le Mesh Viewer
 */
class ColorScale {
    constructor(options = {}) {
        const {
            name = 'default',
            stops = [
                { position: 0, color: '#313695' },
                { position: 0.25, color: '#4575b4' },
                { position: 0.5, color: '#74add1' },
                { position: 0.75, color: '#abd9e9' },
                { position: 1, color: '#e0f3f8' }
            ]
        } = options;

        this.name = name;
        this.stops = stops
            .slice()
            .sort((a, b) => a.position - b.position)
            .map(stop => ({
                position: Math.min(1, Math.max(0, stop.position)),
                color: ColorScale.hexToRgb(stop.color)
            }));
    }

    /**
     * Calcule la couleur correspondant à la valeur normalisée entre min et max
     */
    getColor(value, min, max) {
        if (!Number.isFinite(value)) {
            return [120, 120, 120];
        }

        if (max === min) {
            return this.stops[this.stops.length - 1].color.slice();
        }

        const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
        for (let i = 0; i < this.stops.length - 1; i++) {
            const current = this.stops[i];
            const next = this.stops[i + 1];

            if (t >= current.position && t <= next.position) {
                const range = next.position - current.position || 1;
                const localT = (t - current.position) / range;
                return [
                    Math.round(ColorScale.lerp(current.color[0], next.color[0], localT)),
                    Math.round(ColorScale.lerp(current.color[1], next.color[1], localT)),
                    Math.round(ColorScale.lerp(current.color[2], next.color[2], localT))
                ];
            }
        }

        return this.stops[this.stops.length - 1].color.slice();
    }

    /**
     * Retourne un aperçu de la palette en 5 teintes
     */
    getPreviewStops(count = 5) {
        const preview = [];
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            preview.push(ColorScale.rgbToHex(this.getColor(t, 0, 1)));
        }
        return preview;
    }

    /**
     * Crée une palette atténuée selon un facteur
     */
    createAdjusted(factor = 1) {
        const stops = this.stops.map(stop => ({
            position: stop.position,
            color: ColorScale.rgbToHex(stop.color.map(c => Math.round(ColorScale.clamp(c * factor, 0, 255))))
        }));
        return new ColorScale({ name: `${this.name}-adjusted`, stops });
    }

    static hexToRgb(hex) {
        const normalized = hex.replace('#', '');
        const bigint = parseInt(normalized, 16);
        if (Number.isNaN(bigint)) {
            return [0, 0, 0];
        }
        if (normalized.length === 3) {
            return [
                ((bigint >> 8) & 0xf) * 17,
                ((bigint >> 4) & 0xf) * 17,
                (bigint & 0xf) * 17
            ];
        }
        return [
            (bigint >> 16) & 255,
            (bigint >> 8) & 255,
            bigint & 255
        ];
    }

    static rgbToHex(rgb) {
        return `#${rgb
            .map(v => ColorScale.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
            .join('')}`;
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    static predefinedPalettes() {
        return [
            new ColorScale({
                name: 'viridis',
                stops: [
                    { position: 0, color: '#440154' },
                    { position: 0.25, color: '#31668d' },
                    { position: 0.5, color: '#35b779' },
                    { position: 0.75, color: '#90d743' },
                    { position: 1, color: '#fde725' }
                ]
            }),
            new ColorScale({
                name: 'thermal',
                stops: [
                    { position: 0, color: '#2c7bb6' },
                    { position: 0.25, color: '#abd9e9' },
                    { position: 0.5, color: '#ffffbf' },
                    { position: 0.75, color: '#fdae61' },
                    { position: 1, color: '#d7191c' }
                ]
            }),
            new ColorScale({
                name: 'blueprint',
                stops: [
                    { position: 0, color: '#0f172a' },
                    { position: 0.25, color: '#1d4ed8' },
                    { position: 0.5, color: '#60a5fa' },
                    { position: 0.75, color: '#bfdbfe' },
                    { position: 1, color: '#eff6ff' }
                ]
            }),
            new ColorScale({
                name: 'ember',
                stops: [
                    { position: 0, color: '#1b1b3a' },
                    { position: 0.25, color: '#6f1d1b' },
                    { position: 0.5, color: '#d00000' },
                    { position: 0.75, color: '#f48c06' },
                    { position: 1, color: '#ffba08' }
                ]
            }),
            new ColorScale({
                name: 'seafoam',
                stops: [
                    { position: 0, color: '#0f766e' },
                    { position: 0.25, color: '#14b8a6' },
                    { position: 0.5, color: '#2dd4bf' },
                    { position: 0.75, color: '#5eead4' },
                    { position: 1, color: '#f0fdfa' }
                ]
            })
        ];
    }
}

window.ColorScale = ColorScale;
