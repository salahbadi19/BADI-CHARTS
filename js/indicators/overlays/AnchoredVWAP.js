/**
 * AnchoredVWAP.js
 * Volume Weighted Average Price from a user-defined anchor bar forward.
 *
 *   typical = (high + low + close) / 3
 *   vwap[i] = sum_{j=anchor..i}(typical[j] * volume[j]) / sum_{j=anchor..i}(volume[j])
 *
 * Bars before the anchor are NaN.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class AnchoredVWAP extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'AnchoredVWAP';
        this.type = 'overlay';
        this.color = opts.color || '#b39ddb';
    }
    defaultOptions() { return { anchorIndex: 0 }; }
    calculate(dm) {
        const { highs, lows, closes, volumes } = dm.raw();
        const n = closes.length;
        const out = new Float64Array(n);
        const anchor = Math.max(0, Math.min(n - 1, Math.floor(this.options.anchorIndex)));
        let pvSum = 0;
        let vSum = 0;
        for (let i = 0; i < n; i++) {
            if (i < anchor) { out[i] = NaN; continue; }
            const typical = (highs[i] + lows[i] + closes[i]) / 3;
            pvSum += typical * volumes[i];
            vSum += volumes[i];
            out[i] = vSum > 0 ? pvSum / vSum : closes[i];
        }
        this.buffers.vwap = out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.vwap, this.color, this.lineWidth, pane);
    }
}
