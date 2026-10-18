/**
 * CandleSeries.js
 * High-performance candlestick renderer.
 *
 * Rendering strategy:
 * - Iterate only over visible bars (leftEdge to rightEdge)
 * - Use a single Path2D for wicks, another for up-bodies, another for down-bodies
 * - When barSpacing < 3px, switch to "high-low line" mode for performance
 * - When barSpacing < 1.5px, just draw close line
 *
 * This lets the chart render thousands of bars smoothly even on mobile.
 */
import { SeriesBase } from './SeriesBase.js';

export class CandleSeries extends SeriesBase {
    constructor(options = {}) {
        super(options);
        this.zIndex = 10;
        this.upColor = options.upColor;
        this.downColor = options.downColor;
        this.wickColor = options.wickColor;
        this.upWickColor = options.upWickColor;
        this.downWickColor = options.downWickColor;
        this.bodyRadius = options.bodyRadius || 0;
        this.minBodyWidth = options.minBodyWidth || 1;
        this.showBorder = options.showBorder !== false;
        this.borderColor = options.borderColor;
    }

    draw(ctx, viewport, dm, theme) {
        if (!this.visible || dm.size === 0) return;
        const upColor = this.upColor || theme.upColor;
        const downColor = this.downColor || theme.downColor;
        const upWick = this.upWickColor || theme.upWick;
        const downWick = this.downWickColor || theme.downWick;
        const borderCol = this.borderColor || theme.candleBorder;

        const barSpacing = viewport.barSpacing;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(viewport.rightEdge));

        if (rightIdx < leftIdx) return;

        const { opens, highs, lows, closes } = dm.raw();

        // ---- Mode selection based on zoom level ----
        if (barSpacing < 1.5) {
            // Extremely zoomed out: just draw the close line
            this._drawCloseLine(ctx, viewport, closes, leftIdx, rightIdx, upColor, downColor);
            return;
        }

        if (barSpacing < 4) {
            // Very zoomed out: draw high-low range bars (no bodies)
            this._drawHighLowBars(ctx, viewport, opens, highs, lows, closes, leftIdx, rightIdx, upColor, downColor);
            return;
        }

        // ---- Normal candle rendering ----
        const bodyWidth = Math.max(this.minBodyWidth, barSpacing * 0.7);
        const wickWidth = 1;

        // Three separate paths for batching by color
        const upWicks = new Path2D();
        const downWicks = new Path2D();
        const upBodies = new Path2D();
        const downBodies = new Path2D();

        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = viewport.indexToX(i) + barSpacing / 2;
            const open = opens[i];
            const high = highs[i];
            const low = lows[i];
            const close = closes[i];
            const isUp = close >= open;

            const yHigh = viewport.priceToY(high);
            const yLow = viewport.priceToY(low);
            const yOpen = viewport.priceToY(open);
            const yClose = viewport.priceToY(close);

            const wickPath = isUp ? upWicks : downWicks;
            const bodyPath = isUp ? upBodies : downBodies;

            // Wick: vertical line from high to low
            wickPath.rect(x - wickWidth / 2, yHigh, wickWidth, yLow - yHigh);

            // Body: rectangle from open to close
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
            bodyPath.rect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
        }

        // Draw wicks first (behind bodies)
        ctx.fillStyle = upWick;
        ctx.fill(upWicks);
        ctx.fillStyle = downWick;
        ctx.fill(downWicks);

        // Draw bodies
        ctx.fillStyle = upColor;
        ctx.fill(upBodies);
        ctx.fillStyle = downColor;
        ctx.fill(downBodies);

        // Optional borders for sharper look on wider bars
        if (this.showBorder && barSpacing > 10) {
            ctx.strokeStyle = borderCol;
            ctx.lineWidth = 1;
            ctx.stroke(upBodies);
            ctx.stroke(downBodies);
        }
    }

    /**
     * When zoomed out far, just draw the close price as a line.
     * Color the line green if the current close > previous close, red otherwise.
     */
    _drawCloseLine(ctx, viewport, closes, leftIdx, rightIdx, upColor, downColor) {
        ctx.lineWidth = 1;
        let prevY = null;
        let prevColor = null;
        ctx.beginPath();
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const y = viewport.priceToY(closes[i]);
            const color = (i > 0 && closes[i] >= closes[i - 1]) ? upColor : downColor;
            if (prevY !== null && color === prevColor) {
                ctx.lineTo(x, y);
            } else if (prevY !== null) {
                ctx.strokeStyle = prevColor;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - viewport.barSpacing, prevY);
                ctx.lineTo(x, y);
            } else {
                ctx.moveTo(x, y);
            }
            prevY = y;
            prevColor = color;
        }
        ctx.strokeStyle = prevColor;
        ctx.stroke();
    }

    /**
     * Medium zoom-out: draw thin high-low bars colored by direction.
     */
    _drawHighLowBars(ctx, viewport, opens, highs, lows, closes, leftIdx, rightIdx, upColor, downColor) {
        const wickWidth = Math.max(0.5, viewport.barSpacing * 0.3);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const yHigh = viewport.priceToY(highs[i]);
            const yLow = viewport.priceToY(lows[i]);
            const isUp = closes[i] >= opens[i];
            ctx.fillStyle = isUp ? upColor : downColor;
            ctx.fillRect(x - wickWidth / 2, yHigh, wickWidth, yLow - yHigh);
        }
    }
}
