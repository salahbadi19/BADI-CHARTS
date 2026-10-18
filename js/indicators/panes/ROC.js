/**
 * ROC.js — Rate of Change (percentage).
 *
 *   ROC[i] = (close[i] - close[i - n]) / close[i - n] * 100
 *
 * Unbounded — autoscales from visible data. Renders a 0 reference line.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class ROC extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'ROC';
        this.type = 'pane';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 12 }; }

    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const roc = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (i >= p && closes[i - p] !== 0) roc[i] = (closes[i] - closes[i - p]) / closes[i - p] * 100;
            else roc[i] = NaN;
        }
        this.buffers.roc = roc;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.roc;
        if (!buf) return { min: -1, max: 1 };
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        let min = Infinity, max = -Infinity;
        for (let i = left; i <= right; i++) {
            const v = buf[i];
            if (isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
        }
        if (!isFinite(min) || !isFinite(max)) return { min: -1, max: 1 };
        if (min > 0) min = 0;
        if (max < 0) max = 0;
        const pad = (max - min) * 0.1 || 1;
        return { min: min - pad, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.roc) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.roc, this.color, this.lineWidth, pane);
    }
}
