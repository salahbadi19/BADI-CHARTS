/**
 * WilliamsR.js — Williams %R.
 *
 *   %R = (highestHigh(n) - close) / (highestHigh(n) - lowestLow(n)) * -100
 *
 * Bounded -100 to 0. Renders -20 / -80 reference lines plus %R.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class WilliamsR extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'WilliamsR';
        this.type = 'pane';
        this.color = opts.color || '#9c27b0';
    }
    defaultOptions() { return { period: 14 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const hh = this._highest(highs, this.options.period);
        const ll = this._lowest(lows,  this.options.period);
        const r = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (!isFinite(hh[i]) || !isFinite(ll[i])) { r[i] = NaN; continue; }
            const range = hh[i] - ll[i];
            r[i] = range === 0 ? -50 : (hh[i] - closes[i]) / range * -100;
        }
        this.buffers.r = r;
    }

    visibleRange(viewport, dm) { return { min: -100, max: 0 }; }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.r) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (const lvl of [-20, -80]) {
            const y = this._priceToY(lvl, viewport, pane);
            ctx.moveTo(0, y); ctx.lineTo(right, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawLine(ctx, viewport, this.buffers.r, this.color, this.lineWidth, pane);
    }
}
