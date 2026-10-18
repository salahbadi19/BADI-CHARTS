/**
 * UltimateOsc.js — Ultimate Oscillator (Larry Williams).
 *
 *   BP[i] = close[i] - min(low[i], prevClose)
 *   TR[i] = max(high[i] - low[i], |high[i] - prevClose|, |low[i] - prevClose|)
 *   avg(n)   = sum(BP, n) / sum(TR, n)
 *   UO    = 100 * (4 * avg(7) + 2 * avg(14) + avg(28)) / 7
 *
 * Bounded 0–100. Renders 30 / 70 reference lines plus UO.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class UltimateOsc extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'UltimateOsc';
        this.type = 'pane';
        this.color = opts.color || '#9c27b0';
    }
    defaultOptions() { return { p1: 7, p2: 14, p3: 28 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const bp = new Float64Array(n);
        const tr = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (i === 0) { bp[i] = 0; tr[i] = highs[i] - lows[i]; continue; }
            const pc = closes[i - 1];
            bp[i] = closes[i] - Math.min(lows[i], pc);
            tr[i] = Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - pc),
                Math.abs(lows[i]  - pc)
            );
        }
        const o = this.options;
        const uo = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (i < o.p3 - 1) { uo[i] = NaN; continue; }
            const avg = (p) => {
                let sb = 0, st = 0;
                for (let j = i - p + 1; j <= i; j++) { sb += bp[j]; st += tr[j]; }
                return st === 0 ? 0 : sb / st;
            };
            const a1 = avg(o.p1), a2 = avg(o.p2), a3 = avg(o.p3);
            uo[i] = 100 * (4 * a1 + 2 * a2 + a3) / 7;
        }
        this.buffers.uo = uo;
    }

    visibleRange(viewport, dm) { return { min: 0, max: 100 }; }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.uo) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (const lvl of [30, 50, 70]) {
            const y = this._priceToY(lvl, viewport, pane);
            ctx.moveTo(0, y); ctx.lineTo(right, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawLine(ctx, viewport, this.buffers.uo, this.color, this.lineWidth, pane);
    }
}
