/**
 * PivotPoints.js
 * Classic (daily) Pivot Points overlay.
 *
 * For each trading day, the prior day's high/low/close are used to compute:
 *   PP = (H + L + C) / 3
 *   R1 = 2*PP - L        S1 = 2*PP - H
 *   R2 = PP + (H - L)    S2 = PP - (H - L)
 *   R3 = H + 2*(PP - L)  S3 = L - 2*(H - PP)
 *
 * These levels are drawn as horizontal lines spanning the current day's bars.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class PivotPoints extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'PivotPoints';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0'; // PP
        this.color2 = opts.color2 || '#EA3943'; // Resistance
        this.color3 = opts.color3 || '#16C784'; // Support
    }
    defaultOptions() { return {}; }

    static _dayOf(ts) {
        const DAY = 86_400_000;
        return Math.floor(ts / DAY) * DAY;
    }

    calculate(dm) {
        const { highs, lows, closes, times } = dm.raw();
        const n = closes.length;
        if (n === 0) {
            this.buffers.pp = new Float64Array(0);
            this.buffers.levels = [];
            return;
        }

        // Walk day by day; for each new day compute the levels from the prior day.
        const pp  = new Float64Array(n);
        const r1  = new Float64Array(n);
        const r2  = new Float64Array(n);
        const r3  = new Float64Array(n);
        const s1  = new Float64Array(n);
        const s2  = new Float64Array(n);
        const s3  = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            pp[i] = r1[i] = r2[i] = r3[i] = s1[i] = s2[i] = s3[i] = NaN;
        }

        let curDay = PivotPoints._dayOf(times[0]);
        let dayStart = 0;
        let dayH = highs[0], dayL = lows[0], dayC = closes[0];
        const levels = []; // {dayStart, dayEnd, pp, r1, r2, r3, s1, s2, s3}

        for (let i = 1; i < n; i++) {
            const d = PivotPoints._dayOf(times[i]);
            if (d === curDay) {
                if (highs[i] > dayH) dayH = highs[i];
                if (lows[i]  < dayL) dayL = lows[i];
                dayC = closes[i];
            } else {
                // Day boundary: emit (no levels apply to the first day yet).
                levels.push({ dayStart, dayEnd: i - 1, computed: false });
                curDay = d;
                dayStart = i;
                dayH = highs[i]; dayL = lows[i]; dayC = closes[i];
            }
        }
        levels.push({ dayStart, dayEnd: n - 1, computed: false });

        // For each day >= 1, compute levels from prior day and assign to that day's bars.
        for (let d = 1; d < levels.length; d++) {
            const prev = levels[d - 1];
            // Compute prior-day H/L/C by scanning its bars (we didn't store them).
            let pH = -Infinity, pL = Infinity, pC = NaN;
            for (let i = prev.dayStart; i <= prev.dayEnd; i++) {
                if (highs[i] > pH) pH = highs[i];
                if (lows[i]  < pL) pL = lows[i];
                pC = closes[i];
            }
            const P  = (pH + pL + pC) / 3;
            const R1 = 2 * P - pL;
            const S1 = 2 * P - pH;
            const R2 = P + (pH - pL);
            const S2 = P - (pH - pL);
            const R3 = pH + 2 * (P - pL);
            const S3 = pL - 2 * (pH - P);
            const cur = levels[d];
            cur.computed = true;
            cur.pp = P; cur.r1 = R1; cur.r2 = R2; cur.r3 = R3;
            cur.s1 = S1; cur.s2 = S2; cur.s3 = S3;
            for (let i = cur.dayStart; i <= cur.dayEnd; i++) {
                pp[i] = P; r1[i] = R1; r2[i] = R2; r3[i] = R3;
                s1[i] = S1; s2[i] = S2; s3[i] = S3;
            }
        }

        this.buffers.pp = pp;
        this.buffers.r1 = r1; this.buffers.r2 = r2; this.buffers.r3 = r3;
        this.buffers.s1 = s1; this.buffers.s2 = s2; this.buffers.s3 = s3;
        this.buffers.levels = levels;
    }

    _drawLevel(ctx, viewport, buf, color, pane, dash) {
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
        // Draw contiguous runs of equal value (within a day) as horizontal lines.
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = buf[i];
            if (!isFinite(v)) { started = false; continue; }
            const x1 = viewport.indexToX(i);
            const x2 = x1 + viewport.barSpacing;
            const y = this._priceToY(v, viewport, pane);
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        this._drawLevel(ctx, viewport, this.buffers.r3, this.color2, pane);
        this._drawLevel(ctx, viewport, this.buffers.r2, this.color2, pane);
        this._drawLevel(ctx, viewport, this.buffers.r1, this.color2, pane);
        this._drawLevel(ctx, viewport, this.buffers.pp, this.color,  pane, [4, 4]);
        this._drawLevel(ctx, viewport, this.buffers.s1, this.color3, pane);
        this._drawLevel(ctx, viewport, this.buffers.s2, this.color3, pane);
        this._drawLevel(ctx, viewport, this.buffers.s3, this.color3, pane);
    }
}
