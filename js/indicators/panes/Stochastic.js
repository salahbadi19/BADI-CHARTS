/**
 * Stochastic.js — Fast / Slow Stochastic Oscillator.
 *
 *   %K = (close - lowestLow(n)) / (highestHigh(n) - lowestLow(n)) * 100
 *   %D = SMA(%K, dN)
 *
 * Bounded 0–100. Renders 20 / 80 reference lines plus %K and %D.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class Stochastic extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'Stochastic';
        this.type = 'pane';
        this.color  = opts.color  || '#12C4F0'; // %K
        this.color2 = opts.color2 || '#EA3943'; // %D
    }
    defaultOptions() { return { period: 14, dN: 3 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const hh = this._highest(highs, this.options.period);
        const ll = this._lowest(lows,  this.options.period);
        const k = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (!isFinite(hh[i]) || !isFinite(ll[i])) { k[i] = NaN; continue; }
            const range = hh[i] - ll[i];
            k[i] = range === 0 ? 50 : (closes[i] - ll[i]) / range * 100;
        }
        const d = this._smaRobust(k, this.options.dN);
        this.buffers.k = k;
        this.buffers.d = d;
    }

    visibleRange(viewport, dm) { return { min: 0, max: 100 }; }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.k) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (const lvl of [20, 80]) {
            const y = this._priceToY(lvl, viewport, pane);
            ctx.moveTo(0, y); ctx.lineTo(right, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawLine(ctx, viewport, this.buffers.k, this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.d, this.color2, this.lineWidth, pane);
    }
}
