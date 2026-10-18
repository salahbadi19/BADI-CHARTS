/**
 * TripleEMA.js
 * Triple Exponential Moving Average (TEMA).
 *   TEMA = 3*EMA - 3*EMA(EMA) + EMA(EMA(EMA))
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class TripleEMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'TripleEMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 21 }; }

    _emaRobust(src, period) {
        const n = src.length;
        const out = new Float64Array(n);
        const k = 2 / (period + 1);
        let prev = NaN;
        let count = 0;
        let seedSum = 0;
        for (let i = 0; i < n; i++) {
            const v = src[i];
            if (!isFinite(v)) { out[i] = NaN; continue; }
            count++;
            if (count < period) {
                seedSum += v;
                out[i] = NaN;
            } else if (count === period) {
                seedSum += v;
                prev = seedSum / period;
                out[i] = prev;
            } else {
                prev = v * k + prev * (1 - k);
                out[i] = prev;
            }
        }
        return out;
    }

    calculate(dm) {
        const { closes } = dm.raw();
        const p = this.options.period;
        const e1 = this._ema(closes, p);
        const e2 = this._emaRobust(e1, p);
        const e3 = this._emaRobust(e2, p);
        const out = new Float64Array(closes.length);
        for (let i = 0; i < closes.length; i++) {
            out[i] = isFinite(e3[i]) ? 3 * e1[i] - 3 * e2[i] + e3[i] : NaN;
        }
        this.buffers.tema = out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.tema, this.color, this.lineWidth, pane);
    }
}
