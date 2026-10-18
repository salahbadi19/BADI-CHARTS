/**
 * KeltnerChannel.js
 * Keltner Channel overlay.
 *   middle = EMA(close, period)
 *   atr    = RMA(TR, atrPeriod)   where TR = max(high-low, |high-prevClose|, |low-prevClose|)
 *   upper  = middle + mult * atr
 *   lower  = middle - mult * atr
 * Renders 3 lines plus a translucent fill between upper and lower.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class KeltnerChannel extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'KeltnerChannel';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0';
        this.color2 = opts.color2 || '#EA3943';
    }
    defaultOptions() { return { period: 20, atrPeriod: 10, mult: 2 }; }

    _trueRange(highs, lows, closes) {
        const n = highs.length;
        const tr = new Float64Array(n);
        tr[0] = highs[0] - lows[0];
        for (let i = 1; i < n; i++) {
            const a = highs[i] - lows[i];
            const b = Math.abs(highs[i] - closes[i - 1]);
            const c = Math.abs(lows[i] - closes[i - 1]);
            tr[i] = Math.max(a, b, c);
        }
        return tr;
    }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const ap = this.options.atrPeriod;
        const m = this.options.mult;
        const middle = this._ema(closes, p);
        const tr = this._trueRange(highs, lows, closes);
        const atr = this._rma(tr, ap);
        const upper = new Float64Array(n);
        const lower = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (isFinite(middle[i]) && isFinite(atr[i])) {
                upper[i] = middle[i] + m * atr[i];
                lower[i] = middle[i] - m * atr[i];
            } else {
                upper[i] = NaN;
                lower[i] = NaN;
            }
        }
        this.buffers.middle = middle;
        this.buffers.atr = atr;
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
