/**
 * SMMA.js
 * Smoothed Moving Average, also known as RMA / Wilder's MA.
 *   SMMA[i] = (SMMA[i-1] * (period - 1) + src[i]) / period
 * Seed with a simple average of the first `period` values.
 *
 * Equivalent to _rma but exposed as a separate overlay indicator.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class SMMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'SMMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 14 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        this.buffers.smma = this._rma(closes, this.options.period);
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.smma, this.color, this.lineWidth, pane);
    }
}
