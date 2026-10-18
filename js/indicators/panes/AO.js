/**
 * AO.js — Awesome Oscillator.
 *
 *   median = (high + low) / 2
 *   AO     = SMA(median, 5) - SMA(median, 34)
 *
 * Drawn as a zero-centred histogram, coloured by direction:
 *   green  — AO[i] >= 0 and AO[i] >= AO[i-1]
 *   dk grn — AO[i] >= 0 and AO[i] <  AO[i-1]
 *   red    — AO[i] <  0 and AO[i] <= AO[i-1]
 *   dk red — AO[i] <  0 and AO[i] >  AO[i-1]
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class AO extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'AO';
        this.type = 'pane';
        this.color  = opts.color  || '#16C784'; // up rising
        this.color2 = opts.color2 || '#EA3943'; // down falling
    }
    defaultOptions() { return { fast: 5, slow: 34 }; }

    calculate(dm) {
        const { highs, lows } = dm.raw();
        const n = highs.length;
        const median = new Float64Array(n);
        for (let i = 0; i < n; i++) median[i] = (highs[i] + lows[i]) / 2;
        const fast = this._sma(median, this.options.fast);
        const slow = this._sma(median, this.options.slow);
        const ao = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            ao[i] = (isFinite(fast[i]) && isFinite(slow[i])) ? fast[i] - slow[i] : NaN;
        }
        this.buffers.ao = ao;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.ao;
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
        const buf = this.buffers.ao;
        if (!buf) return;
        const right = viewport.width - 70;
        const y0 = this._priceToY(0, viewport, pane);
        // Zero baseline.
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        // Histogram.
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        const bw = Math.max(1, viewport.barSpacing * 0.7);
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = buf[i];
            if (!isFinite(v)) continue;
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const yv = this._priceToY(v, viewport, pane);
            const top = Math.min(yv, y0);
            const h = Math.abs(yv - y0);
            const rising = i > 0 && isFinite(buf[i - 1]) && v >= buf[i - 1];
            const positive = v >= 0;
            ctx.fillStyle = positive
                ? (rising ? this.color  : this._withAlpha(this.color,  0.5))
                : (rising ? this._withAlpha(this.color2, 0.5) : this.color2);
            ctx.fillRect(x - bw / 2, top, bw, Math.max(1, h));
        }
        ctx.restore();
    }
}
