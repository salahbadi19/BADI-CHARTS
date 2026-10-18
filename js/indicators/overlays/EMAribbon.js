/**
 * EMAribbon.js
 * Exponential MA ribbon overlay — 4 EMAs with periods 8/13/21/55.
 *
 * Each EMA is drawn in a distinct colour so crossovers/stacking are visible.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class EMAribbon extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'EMAribbon';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0'; // 8
        this.color2 = opts.color2 || '#EA3943'; // 13
        this.color3 = opts.color3 || '#16C784'; // 21
        this.color4 = opts.color4 || '#ff9800'; // 55
    }
    defaultOptions() { return { periods: [8, 13, 21, 55] }; }
    calculate(dm) {
        const { closes } = dm.raw();
        const periods = this.options.periods;
        this.buffers.emas = periods.map(p => this._ema(closes, p));
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const colors = [this.color, this.color2, this.color3, this.color4];
        this.buffers.emas.forEach((buf, i) => {
            const c = colors[i % colors.length];
            this._drawLine(ctx, viewport, buf, c, this.lineWidth, pane);
        });
    }
}
