/**
 * SuperTrend.js
 * ATR-based trend overlay.
 *
 *   ATR     = RMA(TR, atrPeriod),  TR = max(high-low, |high-prevClose|, |low-prevClose|)
 *   HL2     = (high + low) / 2
 *   bUp     = HL2 + mult * ATR
 *   bDn     = HL2 - mult * ATR
 *   fUp[i]  = (bUp[i] < fUp[i-1] || close[i-1] > fUp[i-1]) ? bUp[i] : fUp[i-1]
 *   fDn[i]  = (bDn[i] > fDn[i-1] || close[i-1] < fDn[i-1]) ? bDn[i] : fDn[i-1]
 *   trend[i]:
 *     if trend[i-1] == -1 and close[i] > fUp[i-1]: trend = 1
 *     else if trend[i-1] == 1 and close[i] < fDn[i-1]: trend = -1
 *     else: trend = trend[i-1]
 *   superTrend[i] = trend[i] == 1 ? fDn[i] : fUp[i]
 *
 * Color: green (color3) when uptrend, red (color2) when downtrend.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class SuperTrend extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'SuperTrend';
        this.type = 'overlay';
        this.color2 = opts.color2 || '#EA3943'; // downtrend (red)
        this.color3 = opts.color3 || '#16C784'; // uptrend (green)
    }
    defaultOptions() { return { period: 10, mult: 3 }; }

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
        const ap = this.options.period;
        const m = this.options.mult;
        const tr = this._trueRange(highs, lows, closes);
        const atr = this._rma(tr, ap);

        const fUp = new Float64Array(n);
        const fDn = new Float64Array(n);
        const st = new Float64Array(n);
        const trend = new Int8Array(n); // 1 = up, -1 = down

        for (let i = 0; i < n; i++) {
            if (!isFinite(atr[i])) {
                fUp[i] = NaN;
                fDn[i] = NaN;
                st[i] = NaN;
                continue;
            }
            const hl2 = (highs[i] + lows[i]) / 2;
            const bUp = hl2 + m * atr[i];
            const bDn = hl2 - m * atr[i];

            if (i === 0 || !isFinite(fUp[i - 1])) {
                fUp[i] = bUp;
                fDn[i] = bDn;
                trend[i] = closes[i] >= hl2 ? 1 : -1;
                st[i] = trend[i] === 1 ? fDn[i] : fUp[i];
                continue;
            }

            fUp[i] = (bUp < fUp[i - 1] || closes[i - 1] > fUp[i - 1]) ? bUp : fUp[i - 1];
            fDn[i] = (bDn > fDn[i - 1] || closes[i - 1] < fDn[i - 1]) ? bDn : fDn[i - 1];

            const prevTrend = trend[i - 1];
            if (prevTrend === -1 && closes[i] > fUp[i - 1]) {
                trend[i] = 1;
            } else if (prevTrend === 1 && closes[i] < fDn[i - 1]) {
                trend[i] = -1;
            } else {
                trend[i] = prevTrend;
            }
            st[i] = trend[i] === 1 ? fDn[i] : fUp[i];
        }
        this.buffers.supertrend = st;
        this.buffers.trend = trend;
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const buf = this.buffers.supertrend;
        const trend = this.buffers.trend;
        if (!buf) return;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        ctx.lineWidth = this.lineWidth;
        ctx.setLineDash([]);

        // Draw two passes: one for uptrend segments (green) and one for downtrend (red).
        for (let pass = 0; pass < 2; pass++) {
            const wantTrend = pass === 0 ? 1 : -1;
            const color = wantTrend === 1 ? this.color3 : this.color2;
            ctx.strokeStyle = color;
            ctx.beginPath();
            let started = false;
            for (let i = leftIdx; i <= rightIdx; i++) {
                if (!isFinite(buf[i]) || trend[i] !== wantTrend) { started = false; continue; }
                const x = viewport.indexToX(i) + viewport.barSpacing / 2;
                const y = this._priceToY(buf[i], viewport, pane);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
                // Bridge to next bar if it's same trend (handle single-bar gaps gracefully).
            }
            ctx.stroke();
        }
    }
}
