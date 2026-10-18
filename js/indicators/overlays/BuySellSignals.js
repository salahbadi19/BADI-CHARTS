/**
 * BuySellSignals.js — Indicator that draws BUY (up arrow below candle)
 * and SELL (down arrow above candle) signals based on simple momentum
 * reversal detection.
 *
 * Signal logic:
 * - BUY signal: when the current candle is bullish (close > open) AND
 *   the previous candle was bearish (close < open) — a bullish reversal.
 *   Drawn as a GREEN UP ARROW below the candle's low.
 * - SELL signal: when the current candle is bearish (close < open) AND
 *   the previous candle was bullish (close > open) — a bearish reversal.
 *   Drawn as a RED DOWN ARROW above the candle's high.
 *
 * The arrows are drawn as canvas paths (not emoji) for crisp rendering.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class BuySellSignals extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'Buy/Sell Signals';
        this.type = 'overlay';
        this.color  = opts.color  || '#16C784'; // buy (green)
        this.color2 = opts.color2 || '#EA3943'; // sell (red)
    }
    defaultOptions() { return { arrowSize: 8 }; }

    visibleRange(viewport, dm) { return null; }

    calculate(dm) {
        const { opens, closes } = dm.raw();
        const n = dm.size;
        const signals = new Int8Array(n); // 0=none, 1=buy, -1=sell
        for (let i = 1; i < n; i++) {
            const prevUp = closes[i - 1] >= opens[i - 1];
            const curUp = closes[i] >= opens[i];
            if (curUp && !prevUp) signals[i] = 1;   // bullish reversal → BUY
            else if (!curUp && prevUp) signals[i] = -1; // bearish reversal → SELL
        }
        this.buffers.signals = signals;
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const signals = this.buffers.signals;
        if (!signals) return;
        const { highs, lows } = dm.raw();
        const leftIdx = Math.max(1, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(viewport.rightEdge));
        const barSpacing = viewport.barSpacing;
        if (barSpacing < 3) return;

        const arrowSize = Math.max(5, Math.min(12, barSpacing * 0.6));
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = leftIdx; i <= rightIdx; i++) {
            const sig = signals[i];
            if (sig === 0) continue;
            const x = viewport.indexToX(i) + barSpacing / 2;

            if (sig === 1) {
                // BUY — green up arrow BELOW the candle's low
                const y = viewport.priceToY(lows[i]) + arrowSize + 4;
                ctx.fillStyle = this.color;
                ctx.strokeStyle = this.color;
                this._drawUpArrow(ctx, x, y, arrowSize);
            } else {
                // SELL — red down arrow ABOVE the candle's high
                const y = viewport.priceToY(highs[i]) - arrowSize - 4;
                ctx.fillStyle = this.color2;
                ctx.strokeStyle = this.color2;
                this._drawDownArrow(ctx, x, y, arrowSize);
            }
        }
        ctx.restore();
    }

    /** Draw a green up-pointing arrow (BUY) at (x, y). */
    _drawUpArrow(ctx, x, y, s) {
        ctx.beginPath();
        // Arrow head (triangle pointing up)
        ctx.moveTo(x, y - s);
        ctx.lineTo(x - s * 0.6, y);
        ctx.lineTo(x - s * 0.25, y);
        ctx.lineTo(x - s * 0.25, y + s * 0.5);
        ctx.lineTo(x + s * 0.25, y + s * 0.5);
        ctx.lineTo(x + s * 0.25, y);
        ctx.lineTo(x + s * 0.6, y);
        ctx.closePath();
        ctx.fill();
        // Outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    /** Draw a red down-pointing arrow (SELL) at (x, y). */
    _drawDownArrow(ctx, x, y, s) {
        ctx.beginPath();
        // Arrow head (triangle pointing down)
        ctx.moveTo(x, y + s);
        ctx.lineTo(x - s * 0.6, y);
        ctx.lineTo(x - s * 0.25, y);
        ctx.lineTo(x - s * 0.25, y - s * 0.5);
        ctx.lineTo(x + s * 0.25, y - s * 0.5);
        ctx.lineTo(x + s * 0.25, y);
        ctx.lineTo(x + s * 0.6, y);
        ctx.closePath();
        ctx.fill();
        // Outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }
}
