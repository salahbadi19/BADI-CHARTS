/**
 * Crosshair.js
 * Renders the crosshair (vertical + horizontal guide lines) that follows
 * the cursor, plus axis price/time labels at the crosshair position.
 */
import { MathUtils } from '../utils/MathUtils.js';

const _CM_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class Crosshair {
    constructor(options = {}) {
        this.visible = false;
        this.x = 0;
        this.y = 0;
        this.snapToBar = options.snapToBar !== false;
        this.showPriceLabel = options.showPriceLabel !== false;
        this.showTimeLabel = options.showTimeLabel !== false;
        this._priceScaleWidth = 70;
        this._timeScaleHeight = 28;
    }

    /**
     * Update the crosshair position from raw pointer coordinates.
     */
    update(x, y, inside) {
        this.x = x;
        this.y = y;
        this.visible = inside;
    }

    /**
     * Render the crosshair. Snaps the vertical line to the nearest bar center.
     */
    draw(ctx, viewport, dm, theme) {
        if (!this.visible) return;
        const snappedX = this.snapToBar
            ? this._snapX(viewport)
            : this.x;

        ctx.save();
        ctx.strokeStyle = theme.crosshairColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(snappedX + 0.5, 0);
        ctx.lineTo(snappedX + 0.5, viewport.height - this._timeScaleHeight);
        ctx.stroke();

        // Horizontal line (only inside price pane)
        if (this.y < viewport.priceHeight) {
            ctx.beginPath();
            ctx.moveTo(0, this.y + 0.5);
            ctx.lineTo(viewport.width - this._priceScaleWidth, this.y + 0.5);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Price label on the right axis
        if (this.showPriceLabel && this.y < viewport.priceHeight) {
            const price = viewport.yToPrice(this.y);
            const label = MathUtils.formatPrice(price);
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const metrics = ctx.measureText(label);
            const tagW = metrics.width + 14;
            const tagH = 18;
            const tx = viewport.width - this._priceScaleWidth;
            const ty = this.y - tagH / 2;
            ctx.fillStyle = theme.crosshairLabelBg;
            ctx.fillRect(tx, ty, tagW, tagH);
            ctx.fillStyle = theme.crosshairLabelText;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, tx + tagW / 2, ty + tagH / 2);
        }

        // Time label is now drawn on the dedicated time axis strip by ChartEngine._renderTimeAxis
        // (not on the main pane, since the time axis is a separate canvas at the bottom).

        ctx.restore();
    }

    /**
     * Draw the time label on the dedicated time axis strip canvas.
     *
     * FIX: Previously this method computed the bar index by re-rounding the
     * `snappedX` position (which is the bar's CENTER, i.e. fractional index
     * `barIdx + 0.5`). `Math.round(barIdx + 0.5)` returned `barIdx + 1`,
     * causing the time label to show the NEXT minute instead of the current
     * minute. We now read the bar index directly from the cursor's X position
     * using `Math.floor()`, which correctly snaps to the bar the cursor is
     * hovering over.
     */
    drawTimeLabel(ctx, viewport, dm, theme, stripW, stripH) {
        if (!this.visible) return;
        if (!this.showTimeLabel) return;
        const idx = this._getSnappedIdx(viewport);
        if (idx < 0 || idx >= dm.size) return;
        const time = dm.times[idx];
        const d = new Date(time);
        const label = this._formatTime(d, dm.interval);
        const snappedX = this._snapX(viewport);
        ctx.save();
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        const metrics = ctx.measureText(label);
        const tagW = metrics.width + 14;
        const tagH = 18;
        const tx = Math.max(0, Math.min(stripW - this._priceScaleWidth - tagW, snappedX - tagW / 2));
        const ty = (stripH - tagH) / 2;
        ctx.fillStyle = theme.crosshairLabelBg;
        ctx.fillRect(tx, ty, tagW, tagH);
        ctx.fillStyle = theme.crosshairLabelText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, tx + tagW / 2, ty + tagH / 2);
        ctx.restore();
    }

    /**
     * FIX: Returns the integer bar index that the cursor is currently hovering
     * over. Uses `Math.floor()` so that ANY cursor position within bar N's
     * pixel range [N*barSpacing, (N+1)*barSpacing) snaps to bar N (the CURRENT
     * bar). The previous implementation used `Math.round(idx)`, which rounded
     * half-up — so when the cursor was at the center of bar N (idx = N + 0.5)
     * it incorrectly snapped to bar N+1, displaying the NEXT minute's time.
     */
    _getSnappedIdx(viewport) {
        return Math.floor(viewport.xToIndex(this.x));
    }

    _snapX(viewport) {
        const idx = this._getSnappedIdx(viewport);
        return viewport.indexToX(idx) + viewport.barSpacing / 2;
    }

    /**
     * FIX: Format the bar's timestamp with precision appropriate to the
     * interval. For sub-minute intervals (e.g. 1s, 5s, 15s, 30s), we now
     * include seconds so the time is displayed accurately. For sub-second
     * intervals we also include milliseconds.
     */
    _formatTime(d, interval) {
        const pad = (n) => String(n).padStart(2, '0');
        const pad3 = (n) => String(n).padStart(3, '0');
        const hhmm = pad(d.getHours()) + ':' + pad(d.getMinutes());
        if (interval < 1000) {
            // sub-second: HH:MM:SS.mmm
            return hhmm + ':' + pad(d.getSeconds()) + '.' + pad3(d.getMilliseconds());
        } else if (interval < 60 * 1000) {
            // sub-minute: HH:MM:SS
            return hhmm + ':' + pad(d.getSeconds());
        } else if (interval < 24 * 60 * 60 * 1000) {
            // intraday (>= 1 minute): HH:MM
            return hhmm;
        } else {
            return d.getDate() + ' ' + _CM_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
        }
    }
}
