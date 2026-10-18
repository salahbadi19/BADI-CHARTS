/**
 * DPO.js — Detrended Price Oscillator.
 *
 *   shift      = floor(n / 2) + 1
 *   SMA_n      = SMA(close, n)
 *   DPO[i]     = close[i] - SMA_n[i - shift]
 *
 * Removes the trend so price oscillates around 0. Renders a 0 reference.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class DPO extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'DPO';
        this.type = 'pane';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 20 }; }

    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const shift = Math.floor(p / 2) + 1;
        const sma = this._sma(closes, p);
        const dpo = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const j = i - shift;
            if (i >= p - 1 + shift && isFinite(sma[j])) dpo[i] = closes[i] - sma[j];
            else dpo[i] = NaN;
        }
        this.buffers.dpo = dpo;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.dpo;
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
        if (!this.buffers.dpo) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.dpo, this.color, this.lineWidth, pane);
    }
}
