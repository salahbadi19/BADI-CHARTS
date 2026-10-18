/**
 * DonchianChannel.js
 * Donchian Channel overlay.
 *   upper[i] = highest high over the previous `period` bars (excluding current)
 *   lower[i] = lowest low over the previous `period` bars (excluding current)
 *   middle[i] = (upper[i] + lower[i]) / 2
 *
 * We use the conventional lookback that includes the current bar; both lines
 * plus a fill between upper and lower are drawn.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class DonchianChannel extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'DonchianChannel';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0';
        this.color2 = opts.color2 || '#EA3943';
    }
    defaultOptions() { return { period: 20 }; }
    calculate(dm) {
        const { highs, lows } = dm.raw();
        const n = highs.length;
        const p = this.options.period;
        const upper = this._highest(highs, p);
        const lower = this._lowest(lows, p);
        const middle = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            middle[i] = isFinite(upper[i]) && isFinite(lower[i]) ? (upper[i] + lower[i]) / 2 : NaN;
        }
        this.buffers.upper = upper;
        this.buffers.lower = lower;
        this.buffers.middle = middle;
    }
    _drawBand(ctx, viewport, upper, lower, fill) {
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(upper.length - 1, Math.ceil(viewport.rightEdge));
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = upper[i];
            if (!isFinite(v)) { started = false; continue; }
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const y = this._priceToY(v, viewport, null);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        started = false;
        for (let i = rightIdx; i >= leftIdx; i--) {
            const v = lower[i];
            if (!isFinite(v)) { continue; }
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const y = this._priceToY(v, viewport, null);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        this._drawBand(ctx, viewport, this.buffers.upper, this.buffers.lower,
            this._withAlpha(this.color2, 0.05));
        ctx.restore();
        this._drawLine(ctx, viewport, this.buffers.upper,  this.color2, this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.middle, this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.lower,  this.color2, this.lineWidth, pane);
    }
}
