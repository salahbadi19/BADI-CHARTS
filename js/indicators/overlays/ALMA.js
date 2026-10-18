/**
 * ALMA.js
 * Arnaud Legoux Moving Average.
 *
 * Gaussian-weighted moving average. For each window of size `period`, weights
 * are computed from a Gaussian function centered at `offset = (period - 1) *
 * (sigma / (period - 1))` with standard deviation `sigma`.
 *
 *   m = offset
 *   s = sigma
 *   norm = sum_{i=0..period-1} exp(-((i - m)^2) / (2*s*s))
 *   ALMA = sum_{i=0..period-1} src[i] * exp(-((i - m)^2) / (2*s*s)) / norm
 *
 * Convention: the most recent bar in the window corresponds to i = period - 1
 * (the rightmost/Gaussian peak).
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class ALMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'ALMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 9, sigma: 6, offset: 0.85 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const sigma = this.options.sigma;
        const m = Math.floor((p - 1) * this.options.offset);
        const s = sigma;
        const w = new Float64Array(p);
        let norm = 0;
        for (let i = 0; i < p; i++) {
            const ww = Math.exp(-((i - m) ** 2) / (2 * s * s));
            w[i] = ww;
            norm += ww;
        }
        const out = new Float64Array(n);
        for (let i = p - 1; i < n; i++) {
            let acc = 0;
            // i - (p - 1) + j  ==  i - p + 1 + j  -> src index for window slot j
            for (let j = 0; j < p; j++) {
                acc += closes[i - p + 1 + j] * w[j];
            }
            out[i] = acc / norm;
        }
        this.buffers.alma = out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.alma, this.color, this.lineWidth, pane);
    }
}
