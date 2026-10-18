/**
 * RSI.js — Relative Strength Index (Wilder).
 *
 *   change[i]  = close[i] - close[i-1]
 *   gain[i]    = max(change[i], 0)
 *   loss[i]    = max(-change[i], 0)
 *   avgGain    = RMA(gain, period)
 *   avgLoss    = RMA(loss, period)
 *   RSI        = 100 - 100 / (1 + avgGain / avgLoss)   (100 when avgLoss==0)
 *
 * Bounded 0–100. Renders 30 / 50 / 70 reference lines plus the RSI line.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class RSI extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'RSI';
        this.type = 'pane';
        this.color = opts.color || '#9c27b0';
    }
    defaultOptions() { return { period: 14 }; }

    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        const gains = new Float64Array(n);
        const losses = new Float64Array(n);
        for (let i = 1; i < n; i++) {
            const ch = closes[i] - closes[i - 1];
            gains[i] = Math.max(0, ch);
            losses[i] = Math.max(0, -ch);
        }
        const avgGain = this._rma(gains, this.options.period);
        const avgLoss = this._rma(losses, this.options.period);
        const rsi = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (!isFinite(avgGain[i]) || !isFinite(avgLoss[i])) { rsi[i] = NaN; continue; }
            if (avgLoss[i] === 0) rsi[i] = 100;
            else rsi[i] = 100 - 100 / (1 + avgGain[i] / avgLoss[i]);
        }
        this.buffers.rsi = rsi;
    }

    visibleRange(viewport, dm) {
        // RSI is bounded 0–100 — always return that fixed range.
        return { min: 0, max: 100 };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.rsi) return;
        const right = viewport.width - 70;
        // 30 / 50 / 70 reference lines.
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
        // RSI line.
        this._drawLine(ctx, viewport, this.buffers.rsi, this.color, this.lineWidth, pane);
    }
}
