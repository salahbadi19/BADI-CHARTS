/**
 * EMA.js
 * Exponential Moving Average overlay.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class EMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'EMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 21 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        this.buffers.ema = this._ema(closes, this.options.period);
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.ema, this.color, this.lineWidth, pane);
    }
}
