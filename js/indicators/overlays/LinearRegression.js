/**
 * LinearRegression.js
 * Linear Regression channel overlay.
 *
 * For each bar i, fits an ordinary least-squares line over the previous
 * `period` closes (inclusive) and outputs:
 *   - the regression value at bar i (middle)
 *   - the residual standard deviation over the window
 *   - upper = middle + mult * stdev
 *   - lower = middle - mult * stdev
 *
 * Renders the middle regression line plus ±mult stdev channel lines and a
 * translucent fill between upper and lower.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class LinearRegression extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'LinearRegression';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0';
        this.color2 = opts.color2 || '#EA3943';
    }
    defaultOptions() { return { period: 20, mult: 2 }; }
    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const m = this.options.mult;
        const middle = new Float64Array(n).fill(NaN);
        const upper = new Float64Array(n).fill(NaN);
        const lower = new Float64Array(n).fill(NaN);
        // Precompute sums of x and x*x for x = 0..p-1 (independent variable).
        const xs = p * (p - 1) / 2;
        const xx = (p - 1) * p * (2 * p - 1) / 6;
        const xMean = (p - 1) / 2;
        const denomX = xx - p * xMean * xMean;
        for (let i = p - 1; i < n; i++) {
            let sy = 0, sxy = 0;
            for (let j = 0; j < p; j++) {
                const y = closes[i - p + 1 + j];
                sy += y;
                sxy += j * y;
            }
            const yMean = sy / p;
            const slope = denomX !== 0 ? (sxy - p * xMean * yMean) / denomX : 0;
            const intercept = yMean - slope * xMean;
            // Regression value at the rightmost x = p - 1.
            const reg = intercept + slope * (p - 1);
            // Residual stdev.
            let ssr = 0;
            for (let j = 0; j < p; j++) {
                const yhat = intercept + slope * j;
                const y = closes[i - p + 1 + j];
                ssr += (y - yhat) ** 2;
            }
            const sd = Math.sqrt(ssr / p);
            middle[i] = reg;
            upper[i] = reg + m * sd;
            lower[i] = reg - m * sd;
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
        this._drawLine(ctx, viewport, this.buffers.middle, this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.lower,  this.color2, this.lineWidth, pane);
    }
}
