/**
 * CCI.js — Commodity Channel Index.
 *
 *   TP       = (high + low + close) / 3
 *   SMA_TP   = SMA(TP, period)
 *   MeanDev  = mean(|TP[i] - SMA_TP[i]|) over the period window
 *   CCI      = (TP - SMA_TP) / (0.015 * MeanDev)
 *
 * Typically oscillates ±100. Renders ±100 reference lines plus CCI.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class CCI extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'CCI';
        this.type = 'pane';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 20 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const tp = new Float64Array(n);
        for (let i = 0; i < n; i++) tp[i] = (highs[i] + lows[i] + closes[i]) / 3;
        const sma = this._sma(tp, this.options.period);
        const p = this.options.period;
        const cci = new Float64Array(n);
        for (let i = p - 1; i < n; i++) {
            let md = 0;
            for (let j = i - p + 1; j <= i; j++) md += Math.abs(tp[j] - sma[i]);
            md /= p;
            cci[i] = md === 0 ? 0 : (tp[i] - sma[i]) / (0.015 * md);
        }
        this.buffers.cci = cci;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.cci;
        if (!buf) return { min: -100, max: 100 };
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        let min = Infinity, max = -Infinity;
        for (let i = left; i <= right; i++) {
            const v = buf[i];
            if (isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
        }
        if (!isFinite(min) || !isFinite(max)) return { min: -100, max: 100 };
        // Always include ±100 so the reference lines are visible.
        if (min > -100) min = -100;
        if (max < 100) max = 100;
        const pad = (max - min) * 0.05;
        return { min: min - pad, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.cci) return;
        const right = viewport.width - 70;
        // 0 and ±100 reference lines.
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (const lvl of [-100, 0, 100]) {
            const y = this._priceToY(lvl, viewport, pane);
            ctx.moveTo(0, y); ctx.lineTo(right, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawLine(ctx, viewport, this.buffers.cci, this.color, this.lineWidth, pane);
    }
}
