/**
 * ParabolicSAR.js
 * Parabolic Stop-and-Reverse overlay.
 *
 * Standard Welles Wilder algorithm:
 *   - Acceleration factor (af) starts at 0.02, increments by 0.02 on each new
 *     extreme, capped at 0.2.
 *   - In an uptrend:
 *       SAR[i] = SAR[i-1] + af * (EP - SAR[i-1])
 *       SAR[i] = min(SAR[i], low[i-1], low[i-2])    // clamp
 *       if low[i] < SAR[i]: reverse to downtrend
 *           SAR[i] = EP ; EP = low[i] ; af = 0.02
 *       else if high[i] > EP: EP = high[i] ; af = min(af + 0.02, 0.2)
 *   - In a downtrend: mirror image (clamp to max of prior two highs, reverse
 *     when high[i] > SAR[i]).
 *
 * Drawn as dots above (downtrend) or below (uptrend) the candles.
 * Up dots green, down dots red.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class ParabolicSAR extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'ParabolicSAR';
        this.type = 'overlay';
        this.color2 = opts.color2 || '#EA3943'; // downtrend dot (above)
        this.color3 = opts.color3 || '#16C784'; // uptrend dot (below)
    }
    defaultOptions() { return { start: 0.02, increment: 0.02, max: 0.2 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        if (n === 0) {
            this.buffers.psar = new Float64Array(0);
            this.buffers.trend = new Int8Array(0);
            return;
        }
        const psar = new Float64Array(n);
        const trend = new Int8Array(n); // 1 = up, -1 = down
        const start = this.options.start;
        const inc = this.options.increment;
        const maxAF = this.options.max;

        // Initialise: assume uptrend from bar 0, EP = high[0], SAR = low[0].
        let af = start;
        let ep = highs[0];
        let sar = lows[0];
        let tr = 1; // up

        for (let i = 0; i < n; i++) {
            if (i === 0) {
                psar[i] = sar;
                trend[i] = tr;
                // Update EP for bar 0 itself.
                if (highs[i] > ep) ep = highs[i];
                continue;
            }
            // Carry forward: compute tentative SAR for this bar.
            let newSAR = sar + af * (ep - sar);
            // Clamp SAR to prior two lows (uptrend) / highs (downtrend).
            if (tr === 1) {
                newSAR = Math.min(newSAR, lows[i - 1],
                    i >= 2 ? lows[i - 2] : lows[i - 1]);
            } else {
                newSAR = Math.max(newSAR, highs[i - 1],
                    i >= 2 ? highs[i - 2] : highs[i - 1]);
            }
            // Check for reversal.
            if (tr === 1 && lows[i] < newSAR) {
                // Reverse to downtrend.
                tr = -1;
                sar = ep; // SAR becomes the prior EP (highest high)
                ep = lows[i];
                af = start;
                psar[i] = sar;
                trend[i] = tr;
                continue;
            }
            if (tr === -1 && highs[i] > newSAR) {
                // Reverse to uptrend.
                tr = 1;
                sar = ep; // SAR becomes prior EP (lowest low)
                ep = highs[i];
                af = start;
                psar[i] = sar;
                trend[i] = tr;
                continue;
            }
            // No reversal: accept tentative SAR, update EP/AF.
            sar = newSAR;
            if (tr === 1) {
                if (highs[i] > ep) { ep = highs[i]; af = Math.min(af + inc, maxAF); }
            } else {
                if (lows[i] < ep) { ep = lows[i]; af = Math.min(af + inc, maxAF); }
            }
            psar[i] = sar;
            trend[i] = tr;
        }
        this.buffers.psar = psar;
        this.buffers.trend = trend;
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const psar = this.buffers.psar;
        const trend = this.buffers.trend;
        if (!psar || psar.length === 0) return;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(psar.length - 1, Math.ceil(viewport.rightEdge));
        const r = Math.max(1.2, viewport.barSpacing * 0.18);
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = psar[i];
            if (!isFinite(v)) continue;
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const y = this._priceToY(v, viewport, pane);
            ctx.fillStyle = trend[i] === 1 ? this.color3 : this.color2;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
