/**
 * MAribbon.js
 * Moving Average ribbon overlay — 4 SMAs with periods 10/20/50/100.
 *
 * Each MA is drawn in a distinct colour so crossovers/stacking are visible.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class MAribbon extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'MAribbon';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0'; // 10
        this.color2 = opts.color2 || '#EA3943'; // 20
        this.color3 = opts.color3 || '#16C784'; // 50
        this.color4 = opts.color4 || '#ff9800'; // 100
    }
    defaultOptions() { return { periods: [10, 20, 50, 100] }; }
    calculate(dm) {
        const { closes } = dm.raw();
        const periods = this.options.periods;
        this.buffers.mas = periods.map(p => this._sma(closes, p));
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const colors = [this.color, this.color2, this.color3, this.color4];
        this.buffers.mas.forEach((buf, i) => {
            const c = colors[i % colors.length];
            this._drawLine(ctx, viewport, buf, c, this.lineWidth, pane);
        });
    }
}
