/**
 * VWMA.js
 * Volume Weighted Moving Average.
 *   VWMA[i] = sum(close[j] * volume[j]) / sum(volume[j]) over the last `period` bars.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class VWMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'VWMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 20 }; }
    calculate(dm) {
        const { closes, volumes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const out = new Float64Array(n);
        let pvSum = 0;
        let vSum = 0;
        for (let i = 0; i < n; i++) {
            pvSum += closes[i] * volumes[i];
            vSum += volumes[i];
            if (i >= p) {
                pvSum -= closes[i - p] * volumes[i - p];
                vSum -= volumes[i - p];
            }
            if (i >= p - 1 && vSum !== 0) out[i] = pvSum / vSum;
            else out[i] = NaN;
        }
        this.buffers.vwma = out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.vwma, this.color, this.lineWidth, pane);
    }
}
