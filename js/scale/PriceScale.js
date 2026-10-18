/**
 * PriceScale.js
 * Renders the price (Y) axis on the right side of the chart.
 * v0.5 improvements:
 * - Solid gridlines (not dashed) for a cleaner look like TradingView
 * - Better tick spacing with more padding
 * - Cleaner price label formatting
 * - Price tag with rounded corners
 * - Wider axis for better readability
 */
import { MathUtils } from '../utils/MathUtils.js';

export class PriceScale {
    constructor(options = {}) {
        this._updateResponsive();
        // Allow explicit override via options.
        this.width = options.width || this._responsiveWidth;
        this.fontSize = options.fontSize || this._responsiveFontSize;
        this.fontFamily = options.fontFamily || "'JetBrains Mono', 'Consolas', monospace";
        this.tickCount = options.tickCount || this._responsiveTickCount;
        this.align = options.align || 'right';
    }

    /**
     * Compute responsive values based on screen width.
     * Three tiers: small phones (<380px), phones/tablets (<768px), desktop.
     */
    _updateResponsive() {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
        if (w < 380) {
            // Very small phones
            this._responsiveWidth = 38;
            this._responsiveFontSize = 8;
            this._responsiveTickCount = 10;
            this._isMobile = true;
        } else if (w < 768) {
            // Normal phones
            this._responsiveWidth = 42;
            this._responsiveFontSize = 8;
            this._responsiveTickCount = 12;
            this._isMobile = true;
        } else {
            // Desktop / tablet
            this._responsiveWidth = 72;
            this._responsiveFontSize = 10;
            this._responsiveTickCount = 14;
            this._isMobile = false;
        }
    }

    /**
     * Update responsive state on resize.
     */
    updateResponsive() {
        this._updateResponsive();
        this.width = this._responsiveWidth;
        this.fontSize = this._responsiveFontSize;
        this.tickCount = this._responsiveTickCount;
    }

    /**
     * Draw the price axis labels.
     */
    draw(ctx, viewport, theme) {
        const x = viewport.width - this.width;
        const y = 0;
        const w = this.width;
        const h = viewport.priceHeight;

        // Background
        ctx.fillStyle = theme.priceScaleBg;
        ctx.fillRect(x, y, w, h);

        // Border line (left edge of price scale)
        ctx.strokeStyle = theme.priceScaleBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();

        // Compute nice ticks for the visible price range
        const { min, max } = viewport.priceRange;
        const { ticks } = MathUtils.niceTicks(min, max, this.tickCount);

        // On mobile, use compact formatting (fewer decimals) so the font
        // can stay readable. E.g. 67250 instead of 67250.31.
        const padRight = this._isMobile ? 4 : 8;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.priceScaleText;

        for (const price of ticks) {
            if (price < min || price > max) continue;
            const py = viewport.priceToY(price);
            // Gridline on chart
            ctx.strokeStyle = theme.gridLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, py + 0.5);
            ctx.lineTo(x, py + 0.5);
            ctx.stroke();
            // Label — compact format on mobile to keep font readable
            const label = this._isMobile
                ? this._compactPrice(price)
                : MathUtils.formatPrice(price);
            ctx.textAlign = 'right';
            ctx.fillStyle = theme.priceScaleText;
            ctx.fillText(label, x + w - padRight, py);
        }

        // Last price line + label
        this._drawLastPriceLine(ctx, viewport, theme);
    }

    /**
     * Compact price formatting for mobile — removes unnecessary decimals
     * so the number is shorter and the font can stay large.
     * E.g. 67250.31 → "67,250" (with thousands separator, no decimals).
     */
    _compactPrice(price) {
        if (price >= 1000) {
            // Round to integer with thousands separator
            return Math.round(price).toLocaleString('en-US');
        } else if (price >= 1) {
            return price.toFixed(1);
        } else {
            return price.toFixed(3);
        }
    }

    /**
     * Draw the horizontal line indicating the most recent close, plus a price tag.
     * The line is SOLID (not dashed) and extends across the chart.
     * The price tag has a pointed left edge (like TradingView).
     */
    _drawLastPriceLine(ctx, viewport, theme) {
        const dm = viewport._dm;
        if (!dm || dm.size === 0) return;
        const last = dm.get(dm.size - 1);
        if (!last) return;
        const y = viewport.priceToY(last.close);
        if (y < 0 || y > viewport.priceHeight) return;

        const isUp = last.close >= last.open;
        const color = isUp ? theme.upColor : theme.downColor;
        const chartW = viewport.width - this.width;

        // Solid line across chart (thin)
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(chartW, y + 0.5);
        ctx.stroke();

        // Price tag — fills the ENTIRE price scale width (same as the
        // tick labels), so it looks like it's "inside" the axis, not
        // floating above it. Uses the SAME font size as the tick labels.
        const x = viewport.width - this.width;
        const label = this._isMobile
            ? this._compactPrice(last.close)
            : MathUtils.formatPrice(last.close);
        // Use the same font size as the tick labels for consistency.
        ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
        const tagH = this.fontSize + 4;  // same height as tick label row
        const tagW = this.width;         // full axis width (0 to this.width)
        // Tag background — covers the full axis width at this Y
        ctx.fillStyle = color;
        ctx.fillRect(x, y - tagH / 2, tagW, tagH);
        // Label text — right-aligned to match the tick labels
        ctx.fillStyle = theme.lastPriceTagText || '#fff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + this.width - this._isMobile ? 4 : 8, y);
    }
}
