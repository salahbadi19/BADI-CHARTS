/**
 * VWAP.js
 * Volume Weighted Average Price.
 *
 * Cumulative from the start of each trading day. For each bar we add the
 * typical price * volume to a running sum and divide by the cumulative
 * volume. The accumulator resets whenever the calendar day (UTC) changes.
 *
 *   typical = (high + low + close) / 3
 *   vwap[i] = (pvSum_today + typical[i] * volume[i]) / (vSum_today + volume[i])
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class VWAP extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'VWAP';
        this.type = 'overlay';
        this.color = opts.color || '#EA3943';
    }
    defaultOptions() { return {}; }

    static _dayOf(ts) {
        // UTC midnight timestamp (ms) for the day containing `ts`.
        const DAY = 86_400_000;
        return Math.floor(ts / DAY) * DAY;
    }

    calculate(dm) {
        const { highs, lows, closes, volumes, times } = dm.raw();
        const n = closes.length;
        const out = new Float64Array(n);
        let pvSum = 0;
        let vSum = 0;
        let curDay = null;
        for (let i = 0; i < n; i++) {
            const day = VWAP._dayOf(times[i]);
            if (curDay === null || day !== curDay) {
                curDay = day;
                pvSum = 0;
                vSum = 0;
            }
            const typical = (highs[i] + lows[i] + closes[i]) / 3;
            pvSum += typical * volumes[i];
            vSum += volumes[i];
            out[i] = vSum > 0 ? pvSum / vSum : closes[i];
        }
        this.buffers.vwap = out;
    }
    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        // Draw segment-by-segment so daily resets produce clean breaks.
        const buf = this.buffers.vwap;
        if (!buf) return;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        const { times } = dm.raw();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.setLineDash([]);
        ctx.beginPath();
        let started = false;
        let curDay = null;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = buf[i];
            if (!isFinite(v)) { started = false; continue; }
            const day = VWAP._dayOf(times[i]);
            if (curDay !== null && day !== curDay) started = false;
            curDay = day;
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const y = this._priceToY(v, viewport, pane);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}
