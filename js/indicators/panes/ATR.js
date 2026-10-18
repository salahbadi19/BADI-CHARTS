/**
 * ATR.js — Average True Range (Wilder).
 *
 *   TR[i]  = max(high - low, |high - prevClose|, |low - prevClose|)
 *   ATR    = RMA(TR, period)
 *
 * Unbounded positive line. Autoscales from visible data.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class ATR extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'ATR';
        this.type = 'pane';
        this.color = opts.color || '#ff9800';
    }
    defaultOptions() { return { period: 14 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const tr = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (i === 0) { tr[i] = highs[i] - lows[i]; continue; }
            const pc = closes[i - 1];
            tr[i] = Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - pc),
                Math.abs(lows[i]  - pc)
            );
        }
        this.buffers.atr = this._rma(tr, this.options.period);
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.atr;
        if (!buf) return { min: 0, max: 1 };
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        let min = Infinity, max = -Infinity;
        for (let i = left; i <= right; i++) {
            const v = buf[i];
            if (isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
        }
        if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 };
        if (min > 0) min = 0;
        const pad = (max - min) * 0.1 || max * 0.1 || 1;
        return { min, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.atr) return;
        this._drawLine(ctx, viewport, this.buffers.atr, this.color, this.lineWidth, pane);
    }
}
