/**
 * TSI.js — True Strength Index.
 *
 *   mom     = close[i] - close[i-1]
 *   TSI     = 100 * EMA(EMA(mom, r), s) / EMA(EMA(|mom|, r), s)
 *
 * Defaults r = 25, s = 13. Bounded nominally -100..+100 (autoscales).
 * Renders a 0 reference line plus TSI.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class TSI extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'TSI';
        this.type = 'pane';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { r: 25, s: 13 }; }

    _emaRobust(src, period) {
        const n = src.length;
        const out = new Float64Array(n);
        const k = 2 / (period + 1);
        let prev = NaN, count = 0, seedSum = 0;
        for (let i = 0; i < n; i++) {
            const v = src[i];
            if (!isFinite(v)) { out[i] = NaN; continue; }
            count++;
            if (count < period) { seedSum += v; out[i] = NaN; }
            else if (count === period) { seedSum += v; prev = seedSum / period; out[i] = prev; }
            else { prev = v * k + prev * (1 - k); out[i] = prev; }
        }
        return out;
    }

    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const mom = new Float64Array(n);
        const abs = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (i === 0) { mom[i] = NaN; abs[i] = NaN; }
            else { mom[i] = closes[i] - closes[i - 1]; abs[i] = Math.abs(mom[i]); }
        }
        const r = this.options.r, s = this.options.s;
        const em1  = this._emaRobust(mom, r);
        const em2  = this._emaRobust(em1,  s);
        const ea1  = this._emaRobust(abs, r);
        const ea2  = this._emaRobust(ea1,  s);
        const tsi = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (isFinite(em2[i]) && isFinite(ea2[i]) && ea2[i] !== 0) tsi[i] = 100 * em2[i] / ea2[i];
            else tsi[i] = NaN;
        }
        this.buffers.tsi = tsi;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.tsi;
        if (!buf) return { min: -100, max: 100 };
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        let min = Infinity, max = -Infinity;
        for (let i = left; i <= right; i++) {
            const v = buf[i];
            if (isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
        }
        if (!isFinite(min) || !isFinite(max)) return { min: -100, max: 100 };
        if (min > 0) min = 0;
        if (max < 0) max = 0;
        const pad = (max - min) * 0.1 || 5;
        return { min: min - pad, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.tsi) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.tsi, this.color, this.lineWidth, pane);
    }
}
