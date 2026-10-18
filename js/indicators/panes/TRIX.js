/**
 * TRIX.js — Triple-smoothed EMA rate of change.
 *
 *   ema1   = EMA(close, n)
 *   ema2   = EMA(ema1, n)
 *   ema3   = EMA(ema2, n)
 *   TRIX   = (ema3[i] - ema3[i-1]) / ema3[i-1] * 100
 *   Signal = EMA(TRIX, signalN)
 *
 * Oscillates around 0. Renders TRIX + Signal lines plus a 0 reference.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class TRIX extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'TRIX';
        this.type = 'pane';
        this.color  = opts.color  || '#12C4F0'; // TRIX
        this.color2 = opts.color2 || '#EA3943'; // Signal
    }
    defaultOptions() { return { period: 12, signal: 9 }; }

    /** EMA that tolerates leading NaN values in `src`. */
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
        const p = this.options.period;
        const e1 = this._ema(closes, p);
        const e2 = this._emaRobust(e1, p);
        const e3 = this._emaRobust(e2, p);
        const n = closes.length;
        const trix = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (isFinite(e3[i]) && i > 0 && isFinite(e3[i - 1]) && e3[i - 1] !== 0) {
                trix[i] = (e3[i] - e3[i - 1]) / e3[i - 1] * 100;
            } else trix[i] = NaN;
        }
        this.buffers.trix = trix;
        this.buffers.signal = this._emaRobust(trix, this.options.signal);
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const bufs = [this.buffers.trix, this.buffers.signal];
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min((bufs[0]?.length || 0) - 1, Math.ceil(viewport.rightEdge));
        let min = Infinity, max = -Infinity;
        for (const b of bufs) {
            if (!b) continue;
            for (let i = left; i <= right; i++) {
                const v = b[i];
                if (isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
            }
        }
        if (!isFinite(min) || !isFinite(max)) return { min: -1, max: 1 };
        if (min > 0) min = 0;
        if (max < 0) max = 0;
        const pad = (max - min) * 0.1 || 1;
        return { min: min - pad, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.trix) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.trix,   this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.signal, this.color2, this.lineWidth, pane);
    }
}
