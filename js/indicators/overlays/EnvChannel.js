/**
 * EnvChannel.js
 * Envelope channel overlay.
 *   middle = SMA(close, period)
 *   upper  = middle * (1 + pct)
 *   lower  = middle * (1 - pct)
 * Renders 3 lines plus a translucent fill between upper and lower.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class EnvChannel extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'EnvChannel';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0';
        this.color2 = opts.color2 || '#EA3943';
    }
    defaultOptions() { return { period: 20, percent: 0.025 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const pct = this.options.percent;
        const middle = this._sma(closes, p);
        const upper = new Float64Array(n);
        const lower = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (isFinite(middle[i])) {
                upper[i] = middle[i] * (1 + pct);
                lower[i] = middle[i] * (1 - pct);
            } else {
                upper[i] = NaN;
                lower[i] = NaN;
            }
        }
        this.buffers.middle = middle;
        this.buffers.upper = upper;
        this.buffers.lower = lower;
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
        this._drawLine(ctx, viewport, this.buffers.middle, this.color,  this.lineWidth, pane, [4, 4]);
        this._drawLine(ctx, viewport, this.buffers.lower,  this.color2, this.lineWidth, pane);
    }
}
