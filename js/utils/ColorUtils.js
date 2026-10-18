/**
 * ColorUtils.js
 * Color manipulation utilities for theming and gradients.
 */
export const ColorUtils = {
    /**
     * Parse a hex color (#rgb, #rrggbb, #rrggbbaa) into RGBA components.
     */
    hexToRgba(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const a = hex.length === 8 ? parseInt(hex.substr(6, 2), 16) / 255 : 1;
        return { r, g, b, a };
    },

    /**
     * Convert RGBA components to an rgba() string.
     */
    toRgbaString(r, g, b, a = 1) {
        return `rgba(${r|0},${g|0},${b|0},${a})`;
    },

    /**
     * Adjust the alpha of a color.
     */
    withAlpha(color, alpha) {
        const { r, g, b } = this.hexToRgba(color);
        return this.toRgbaString(r, g, b, alpha);
    },

    /**
     * Lighten a color by a given amount (0-1).
     */
    lighten(color, amount) {
        const { r, g, b, a } = this.hexToRgba(color);
        const nr = Math.min(255, r + (255 - r) * amount);
        const ng = Math.min(255, g + (255 - g) * amount);
        const nb = Math.min(255, b + (255 - b) * amount);
        return this.toRgbaString(nr, ng, nb, a);
    },

    /**
     * Darken a color by a given amount (0-1).
     */
    darken(color, amount) {
        const { r, g, b, a } = this.hexToRgba(color);
        return this.toRgbaString(r * (1 - amount), g * (1 - amount), b * (1 - amount), a);
    },

    /**
     * Create a vertical linear gradient between two colors.
     */
    verticalGradient(ctx, x, y, w, h, colorTop, colorBottom) {
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(1, colorBottom);
        return grad;
    }
};
