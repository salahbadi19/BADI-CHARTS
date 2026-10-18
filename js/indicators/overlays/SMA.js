/**
 * SMA.js
 * Simple Moving Average overlay.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class SMA extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'SMA';
        this.type = 'overlay';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 20 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        this.buffers.ma = this._sma(closes, this.options.period);
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLine(ctx, viewport, this.buffers.ma, this.color, this.lineWidth, pane);
    }
}
