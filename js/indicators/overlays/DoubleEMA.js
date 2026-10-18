/**
 * DoubleEMA.js
 * Double Exponential Moving Average (DEMA).
 *   DEMA = 2 * EMA(src) - EMA(EMA(src))
 * Reduces lag versus a single EMA of the same period.
 *
 * Note: we use a NaN-tolerant EMA helper because the first EMA's output has
 * NaN values for the first `period-1` bars, which would otherwise break the
 * seeding of the second EMA.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class DoubleEMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'DoubleEMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 21 }; }

    /** EMA that tolerates leading NaN values in `src` (seeds after `period` finite values). */
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
        const ema1 = this._ema(closes, p);
        const ema2 = this._emaRobust(ema1, p);
        const out = new Float64Array(closes.length);
        for (let i = 0; i < closes.length; i++) {
            out[i] = isFinite(ema2[i]) ? 2 * ema1[i] - ema2[i] : NaN;
        }
        this.buffers.dema = out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.dema, this.color, this.lineWidth, pane);
    }
}
