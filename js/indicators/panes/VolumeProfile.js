/**
 * VolumeProfile.js — Horizontal volume histogram over the LAST 20 candles.
 *
 * Renders as STRIPS (thin horizontal bars) positioned directly OVER the
 * x-range of the last 20 candles — not from the left edge of the chart,
 * not from the right price axis.
 *
 * Design:
 * - Computes volume distribution across price buckets for the last N bars.
 * - Each bucket is drawn as a THIN horizontal strip (height proportional
 *   to barSpacing, so it scales with zoom).
 * - Strips are anchored at the LEFT edge of the last-N-candle range and
 *   grow RIGHTWARD — staying within the candle area.
 * - Width of each strip = (bucket volume / max volume) × candle area width.
 * - Up volume = green strip (top half), down volume = red strip (bottom half).
 * - 3 reference lines: POC, VAH, VAL — spanning the candle area only.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class VolumeProfile extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'Volume Profile';
        this.type = 'overlay';
        this.color  = opts.color  || '#16C784'; // up volume
        this.color2 = opts.color2 || '#EA3943'; // down volume
        this.color3 = opts.color3 || '#FFC107'; // POC line
    }
    defaultOptions() { return { buckets: 20, recentBars: 20, showValueArea: true }; }

    visibleRange(viewport, dm) { return null; }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const { highs, lows, opens, closes, volumes } = dm.raw();
        const n = dm.size;
        if (n < 2) return;

        // Only use the LAST N bars for the volume profile.
        const recentN = Math.min(this.options.recentBars || 20, n);
        const startIdx = n - recentN;
        const endIdx = n - 1;

        // Compute the price range for the last N bars.
        let pMin = Infinity, pMax = -Infinity;
        for (let i = startIdx; i <= endIdx; i++) {
            if (highs[i] > pMax) pMax = highs[i];
            if (lows[i]  < pMin) pMin = lows[i];
        }
        if (!isFinite(pMin) || !isFinite(pMax) || pMax <= pMin) {
            pMin = viewport.priceRange.min;
            pMax = viewport.priceRange.max;
            if (pMax <= pMin) return;
        }

        const NB = Math.max(2, this.options.buckets | 0);
        const bucketSize = (pMax - pMin) / NB;
        const upVol = new Float64Array(NB);
        const dnVol = new Float64Array(NB);
        for (let i = startIdx; i <= endIdx; i++) {
            const tp = (highs[i] + lows[i] + closes[i]) / 3;
            let b = Math.floor((tp - pMin) / bucketSize);
            if (b < 0) b = 0;
            if (b >= NB) b = NB - 1;
            const isUp = closes[i] >= opens[i];
            if (isUp) upVol[b] += volumes[i];
            else      dnVol[b] += volumes[i];
        }
        let maxVol = 0;
        let pocBucket = 0, pocVol = 0;
        for (let i = 0; i < NB; i++) {
            const total = upVol[i] + dnVol[i];
            if (total > maxVol) maxVol = total;
            if (total > pocVol) { pocVol = total; pocBucket = i; }
        }
        if (maxVol <= 0) return;

        // Compute Value Area (70% of total volume around POC).
        let totalVol = 0;
        for (let i = 0; i < NB; i++) totalVol += upVol[i] + dnVol[i];
        let vaLow = 0, vaHigh = NB - 1;
        if (this.options.showValueArea !== false && totalVol > 0) {
            let cumVol = upVol[pocBucket] + dnVol[pocBucket];
            let lo = pocBucket, hi = pocBucket;
            while (cumVol < totalVol * 0.70 && (lo > 0 || hi < NB - 1)) {
                const volLo = lo > 0 ? (upVol[lo - 1] + dnVol[lo - 1]) : -1;
                const volHi = hi < NB - 1 ? (upVol[hi + 1] + dnVol[hi + 1]) : -1;
                if (volHi >= volLo && volHi > 0) { hi++; cumVol += volHi; }
                else if (volLo > 0) { lo--; cumVol += volLo; }
                else break;
            }
            vaLow = lo; vaHigh = hi;
        }

        // The x-range of the last N candles on screen.
        const barSpacing = viewport.barSpacing;
        const xStart = viewport.indexToX(startIdx);           // left edge of first candle
        const xEnd = viewport.indexToX(endIdx) + barSpacing;  // right edge of last candle
        const candleAreaW = Math.max(10, xEnd - xStart);

        // Strip height scales with barSpacing — grows/shrinks with zoom.
        // At barSpacing=8, stripH ≈ 5px. At barSpacing=2, stripH ≈ 1.5px.
        const stripH = Math.max(1, barSpacing * 0.6);

        ctx.save();

        // Draw strips — each bucket is a thin horizontal strip positioned
        // within the candle area (xStart to xEnd).
        for (let i = 0; i < NB; i++) {
            const priceLo = pMin + i * bucketSize;
            const priceHi = priceLo + bucketSize;
            const yMid = viewport.priceToY((priceLo + priceHi) / 2);

            // Up volume strip (top half of the strip row).
            const wUp = (upVol[i] / maxVol) * candleAreaW;
            if (wUp > 0) {
                ctx.fillStyle = this._withAlpha(this.color, 0.50);
                ctx.fillRect(xStart, yMid - stripH / 2, wUp, stripH / 2);
            }
            // Down volume strip (bottom half).
            const wDn = (dnVol[i] / maxVol) * candleAreaW;
            if (wDn > 0) {
                ctx.fillStyle = this._withAlpha(this.color2, 0.50);
                ctx.fillRect(xStart, yMid, wDn, stripH / 2);
            }
            // Thin outline on the dominant side for clarity.
            const domW = Math.max(wUp, wDn);
            if (domW > 1) {
                ctx.strokeStyle = (upVol[i] >= dnVol[i]) ? this.color : this.color2;
                ctx.lineWidth = 0.5;
                ctx.globalAlpha = 0.6;
                ctx.strokeRect(xStart + 0.5, yMid - stripH / 2 + 0.5, domW - 1, stripH - 1);
                ctx.globalAlpha = 1;
            }
        }

        // --- 3 reference lines (spanning the candle area only) ---
        const pocPrice = pMin + (pocBucket + 0.5) * bucketSize;
        const yPOC = viewport.priceToY(pocPrice);
        ctx.strokeStyle = this.color3;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(xStart, yPOC + 0.5);
        ctx.lineTo(xEnd, yPOC + 0.5);
        ctx.stroke();

        const vahPrice = pMin + (vaHigh + 1) * bucketSize;
        const yVAH = viewport.priceToY(vahPrice);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xStart, yVAH + 0.5);
        ctx.lineTo(xEnd, yVAH + 0.5);
        ctx.stroke();

        const valPrice = pMin + vaLow * bucketSize;
        const yVAL = viewport.priceToY(valPrice);
        ctx.strokeStyle = this.color2;
        ctx.beginPath();
        ctx.moveTo(xStart, yVAL + 0.5);
        ctx.lineTo(xEnd, yVAL + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels at the right edge of the candle area.
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.color3;
        ctx.fillText('POC ' + this._fmtPrice(pocPrice), xEnd + 4, yPOC);
        ctx.fillStyle = this.color;
        ctx.fillText('VAH ' + this._fmtPrice(vahPrice), xEnd + 4, yVAH);
        ctx.fillStyle = this.color2;
        ctx.fillText('VAL ' + this._fmtPrice(valPrice), xEnd + 4, yVAL);

        ctx.restore();
    }

    _fmtPrice(p) {
        if (p >= 1000) return p.toFixed(0);
        if (p >= 1) return p.toFixed(2);
        return p.toFixed(4);
    }
}
