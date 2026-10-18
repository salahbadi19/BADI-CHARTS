/**
 * HullMA.js
 * Hull Moving Average (Alan Hull).
 *   WMA2 = WMA(src, n/2)
 *   WMA  = WMA(src, n)
 *   diff = WMA2 * 2 - WMA
 *   HullMA = WMA(diff, sqrt(n))
 *
 * The result is a smoothed, low-lag moving average.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class HullMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'HullMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 20 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        const n = this.options.period;
        const half = Math.max(1, Math.floor(n / 2));
        const sqrtN = Math.max(1, Math.round(Math.sqrt(n)));

        const wmaHalf = this._wma(closes, half);
        const wmaFull = this._wma(closes, n);
        const diff = new Float64Array(closes.length);
        for (let i = 0; i < closes.length; i++) {
            diff[i] = isFinite(wmaHalf[i]) && isFinite(wmaFull[i]) ? 2 * wmaHalf[i] - wmaFull[i] : NaN;
        }
        // _wma requires finite values for the period window; use a NaN-tolerant WMA.
        this.buffers.hull = this._wmaRobust(diff, sqrtN);
    }
    /** WMA that tolerates leading NaN values in `src`. */
    _wmaRobust(src, period) {
        const n = src.length;
        const out = new Float64Array(n);
        const denom = period * (period + 1) / 2;
        // Maintain a sliding window of the last `period` finite values.
        const ring = new Array(period).fill(NaN);
        let count = 0;
        let ringIdx = 0;
        for (let i = 0; i < n; i++) {
            const v = src[i];
            if (isFinite(v)) {
                ring[ringIdx % period] = v;
                ringIdx++;
                count++;
            } else {
                out[i] = NaN;
                continue;
            }
            if (count < period) { out[i] = NaN; continue; }
            // Walk the ring from oldest (j=0, weight=1) to newest (j=period-1, weight=period).
            let sum = 0;
            const start = ringIdx % period;
            for (let j = 0; j < period; j++) {
                const val = ring[(start + j) % period];
                const weight = j + 1;
                sum += val * weight;
            }
            out[i] = sum / denom;
        }
        return out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.hull, this.color, this.lineWidth, pane);
    }
}
