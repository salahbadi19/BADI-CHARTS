/**
 * KAMA.js
 * Kaufman Adaptive Moving Average.
 *
 *   change = |close[i] - close[i - period]|
 *   volatility = sum_{j=i-period+1..i} |close[j] - close[j-1]|
 *   er = change / volatility  (efficiency ratio, in [0, 1]; 0 if vol == 0)
 *   fast = 2/(fastPeriod + 1)
 *   slow = 2/(slowPeriod + 1)
 *   sc  = (er * (fast - slow) + slow) ** 2    (smoothing constant)
 *   KAMA[i] = KAMA[i-1] + sc * (close[i] - KAMA[i-1])
 *
 * Seeds KAMA at the first bar where the period window is available with the
 * close price at that bar.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class KAMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'KAMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 10, fastPeriod: 2, slowPeriod: 30 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const fast = 2 / (this.options.fastPeriod + 1);
        const slow = 2 / (this.options.slowPeriod + 1);
        const out = new Float64Array(n);
        let prev = NaN;
        for (let i = 0; i < n; i++) {
            if (i < p) { out[i] = NaN; continue; }
            const change = Math.abs(closes[i] - closes[i - p]);
            let vol = 0;
            for (let j = i - p + 1; j <= i; j++) vol += Math.abs(closes[j] - closes[j - 1]);
            const er = vol === 0 ? 0 : change / vol;
            const sc = (er * (fast - slow) + slow) ** 2;
            if (!isFinite(prev)) {
                // Seed with current close once the first valid window is available.
                prev = closes[i];
                out[i] = prev;
                continue;
            }
            prev = prev + sc * (closes[i] - prev);
            out[i] = prev;
        }
        this.buffers.kama = out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.kama, this.color, this.lineWidth, pane);
    }
}
