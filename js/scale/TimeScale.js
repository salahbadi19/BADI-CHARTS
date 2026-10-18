/**
 * TimeScale.js
 * Renders the time (X) axis. Separated into:
 *   - drawGridlines: only vertical gridlines (called on every pane)
 *   - drawLabels: the bottom axis bar with time labels (called once on the time axis strip)
 */
import { MathUtils } from '../utils/MathUtils.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class TimeScale {
    constructor(options = {}) {
        this._updateResponsive();
        this.height = options.height || this._responsiveHeight;
        this.fontSize = options.fontSize || this._responsiveFontSize;
        this.fontFamily = options.fontFamily || "'JetBrains Mono', 'Consolas', monospace";
        this._updateResponsive2();
    }

    _updateResponsive() {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
        if (w < 768) {
            this._responsiveHeight = 22;
            this._responsiveFontSize = 9;
        } else {
            this._responsiveHeight = 28;
            this._responsiveFontSize = 11;
        }
    }

    _updateResponsive2() {
        this.minTickSpacing = (this._responsiveHeight < 25) ? 50 : 70;
        this.priceScaleWidth = 70; // set by ChartEngine
    }

    updateResponsive() {
        this._updateResponsive();
        this.height = this._responsiveHeight;
        this.fontSize = this._responsiveFontSize;
        this._updateResponsive2();
    }

    _pickFormatter(interval) {
        if (interval < 60 * 60 * 1000) {
            return (t) => {
                const d = new Date(t);
                return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
            };
        } else if (interval < 24 * 60 * 60 * 1000) {
            return (t) => {
                const d = new Date(t);
                return String(d.getHours()).padStart(2, '0') + ':00';
            };
        } else if (interval < 7 * 24 * 60 * 60 * 1000) {
            return (t) => {
                const d = new Date(t);
                return d.getDate() + ' ' + MONTHS[d.getMonth()];
            };
        } else {
            return (t) => {
                const d = new Date(t);
                return MONTHS[d.getMonth()] + " '" + String(d.getFullYear()).slice(2);
            };
        }
    }

    /**
     * Draw only vertical gridlines (no labels). Called on each pane's canvas.
     */
    drawGridlines(ctx, viewport, dm, theme, w, h) {
        if (dm.size === 0) return;
        const barSpacingPx = viewport.barSpacing;
        const step = Math.max(1, Math.ceil(this.minTickSpacing / barSpacingPx));
        const leftIdx = Math.floor(viewport.leftEdge);
        const startIdx = Math.ceil(leftIdx / step) * step;
        const rightIdx = Math.ceil(viewport.rightEdge);
        ctx.strokeStyle = theme.gridLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        for (let i = startIdx; i <= rightIdx; i += step) {
            if (i < 0 || i >= dm.size) continue;
            const x = viewport.indexToX(i) + barSpacingPx / 2;
            if (x < 0 || x > w - this.priceScaleWidth) continue;
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, h);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    /**
     * Draw the time axis bar with labels. Called ONCE on the dedicated time axis canvas
     * at the very bottom of the chart.
     */
    drawLabels(ctx, viewport, dm, theme, w, h) {
        if (dm.size === 0) return;
        // Background
        ctx.fillStyle = theme.timeScaleBg;
        ctx.fillRect(0, 0, w, h);
        // Top border
        ctx.strokeStyle = theme.timeScaleBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0.5);
        ctx.lineTo(w, 0.5);
        ctx.stroke();

        const formatter = this._pickFormatter(dm.interval);
        const barSpacingPx = viewport.barSpacing;
        const step = Math.max(1, Math.ceil(this.minTickSpacing / barSpacingPx));
        const leftIdx = Math.floor(viewport.leftEdge);
        const startIdx = Math.ceil(leftIdx / step) * step;
        const rightIdx = Math.ceil(viewport.rightEdge);

        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = theme.timeScaleText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = startIdx; i <= rightIdx; i += step) {
            if (i < 0 || i >= dm.size) continue;
            const x = viewport.indexToX(i) + barSpacingPx / 2;
            if (x < 0 || x > w - this.priceScaleWidth) continue;
            const time = dm.times[i];
            const label = formatter(time);
            ctx.fillText(label, x, h / 2);
        }
    }
}
