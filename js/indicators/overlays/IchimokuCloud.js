/**
 * IchimokuCloud.js
 * Ichimoku Kinko Hyo overlay.
 *
 *   Tenkan-sen  = (highest(high, 9)  + lowest(low, 9))  / 2
 *   Kijun-sen   = (highest(high, 26) + lowest(low, 26)) / 2
 *   Senkou A    = (Tenkan + Kijun) / 2, plotted 26 bars ahead
 *   Senkou B    = (highest(high, 52) + lowest(low, 52)) / 2, plotted 26 bars ahead
 *   Chikou Span = close, plotted 26 bars back
 *
 * The "cloud" (Kumo) is the region between Senkou A and Senkou B. We render
 * the cloud as a filled polygon (green where A >= B, red where A < B), plus
 * the five lines. Senkou A/B are drawn at index `i + displacement`; Chikou
 * at `i - displacement`.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class IchimokuCloud extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'IchimokuCloud';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0'; // Tenkan
        this.color2 = opts.color2 || '#EA3943'; // Kijun
        this.color3 = opts.color3 || '#16C784'; // Senkou A
    }
    defaultOptions() { return { tenkan: 9, kijun: 26, senkouB: 52, displacement: 26 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const tP = this.options.tenkan;
        const kP = this.options.kijun;
        const sbP = this.options.senkouB;
        const d = this.options.displacement;

        const tenkanH = this._highest(highs, tP);
        const tenkanL = this._lowest(lows, tP);
        const kijunH  = this._highest(highs, kP);
        const kijunL  = this._lowest(lows, kP);
        const senkouBH = this._highest(highs, sbP);
        const senkouBL = this._lowest(lows, sbP);

        const tenkan = new Float64Array(n);
        const kijun  = new Float64Array(n);
        const senkouA = new Float64Array(n);
        const senkouB = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            tenkan[i]  = (isFinite(tenkanH[i]) && isFinite(tenkanL[i]))  ? (tenkanH[i] + tenkanL[i]) / 2  : NaN;
            kijun[i]   = (isFinite(kijunH[i])  && isFinite(kijunL[i]))   ? (kijunH[i]  + kijunL[i])  / 2  : NaN;
            senkouA[i] = (isFinite(tenkan[i]) && isFinite(kijun[i]))    ? (tenkan[i] + kijun[i]) / 2     : NaN;
            senkouB[i] = (isFinite(senkouBH[i]) && isFinite(senkouBL[i])) ? (senkouBH[i] + senkouBL[i]) / 2 : NaN;
        }
        this.buffers.tenkan = tenkan;
        this.buffers.kijun = kijun;
        this.buffers.senkouA = senkouA;
        this.buffers.senkouB = senkouB;
        this.buffers.chikou = closes;
        this._displacement = d;
    }

    /** Plot a buffer shifted by `shift` bars (positive = right/ahead). */
    _drawShifted(ctx, viewport, buf, shift, color, lineWidth, pane, dash) {
        const n = buf.length;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge - shift));
        const rightIdx = Math.min(n - 1, Math.ceil(viewport.rightEdge - shift));
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = buf[i];
            if (!isFinite(v)) { started = false; continue; }
            const plotIdx = i + shift;
            const x = viewport.indexToX(plotIdx) + viewport.barSpacing / 2;
            const y = this._priceToY(v, viewport, pane);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    _drawCloud(ctx, viewport, a, b, shift, pane) {
        const n = a.length;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge - shift));
        const rightIdx = Math.min(n - 1, Math.ceil(viewport.rightEdge - shift));
        // Build a polygon by walking A forward then B back, splitting into
        // contiguous non-NaN runs.
        let i = leftIdx;
        while (i <= rightIdx) {
            // Skip leading NaNs.
            while (i <= rightIdx && !(isFinite(a[i]) && isFinite(b[i]))) i++;
            if (i > rightIdx) break;
            const runStart = i;
            while (i <= rightIdx && isFinite(a[i]) && isFinite(b[i])) i++;
            const runEnd = i - 1;
            // Build polygon for [runStart..runEnd].
            ctx.beginPath();
            for (let k = runStart; k <= runEnd; k++) {
                const x = viewport.indexToX(k + shift) + viewport.barSpacing / 2;
                const y = this._priceToY(a[k], viewport, pane);
                if (k === runStart) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            for (let k = runEnd; k >= runStart; k--) {
                const x = viewport.indexToX(k + shift) + viewport.barSpacing / 2;
                const y = this._priceToY(b[k], viewport, pane);
                ctx.lineTo(x, y);
            }
            ctx.closePath();
            // Cloud colour: green when A >= B (bullish), red when A < B (bearish).
            // Use the relationship at the midpoint of the run as a simple heuristic.
            const mid = (runStart + runEnd) >> 1;
            const bullish = a[mid] >= b[mid];
            ctx.fillStyle = bullish
                ? this._withAlpha(this.color3, 0.15)
                : this._withAlpha(this.color2, 0.15);
            ctx.fill();
        }
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const d = this._displacement;
        // Cloud fill (behind lines).
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        this._drawCloud(ctx, viewport, this.buffers.senkouA, this.buffers.senkouB, d, pane);
        ctx.restore();
        // Senkou A & B (shifted forward by `d`).
        this._drawShifted(ctx, viewport, this.buffers.senkouA, d, this.color3, this.lineWidth, pane);
        this._drawShifted(ctx, viewport, this.buffers.senkouB, d, this.color2, this.lineWidth, pane);
        // Tenkan / Kijun (no shift).
        this._drawLine(ctx, viewport, this.buffers.tenkan, this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.kijun,  this.color2, this.lineWidth, pane);
        // Chikou (close shifted back by `d`).
        this._drawShifted(ctx, viewport, this.buffers.chikou, -d, '#787b86', this.lineWidth, pane, [2, 3]);
    }
}
