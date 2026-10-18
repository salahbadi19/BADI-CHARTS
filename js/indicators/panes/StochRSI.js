/**
 * StochRSI.js — Stochastic-of-RSI.
 *
 *   rsi      = RSI(close, rsiPeriod)
 *   stochRSI = (rsi - lowest(rsi, n)) / (highest(rsi, n) - lowest(rsi, n)) * 100
 *   smoothed = SMA(stochRSI, kN)            (optional signal line)
 *
 * Bounded 0–100. Renders 20 / 80 reference lines, the StochRSI line and
 * its SMA signal.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class StochRSI extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'StochRSI';
        this.type = 'pane';
        this.color  = opts.color  || '#9c27b0';
        this.color2 = opts.color2 || '#EA3943';
    }
    defaultOptions() { return { rsiPeriod: 14, stochPeriod: 14, kN: 3 }; }

    calculate(dm) {
        const { closes } = dm.raw();
        const n = closes.length;
        // --- RSI ---
        const gains = new Float64Array(n);
        const losses = new Float64Array(n);
        for (let i = 1; i < n; i++) {
            const ch = closes[i] - closes[i - 1];
            gains[i] = Math.max(0, ch);
            losses[i] = Math.max(0, -ch);
        }
        const avgGain = this._rma(gains, this.options.rsiPeriod);
        const avgLoss = this._rma(losses, this.options.rsiPeriod);
        const rsi = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (!isFinite(avgGain[i]) || !isFinite(avgLoss[i])) { rsi[i] = NaN; continue; }
            if (avgLoss[i] === 0) rsi[i] = 100;
            else rsi[i] = 100 - 100 / (1 + avgGain[i] / avgLoss[i]);
        }
        // --- Stochastic of RSI ---
        const rsiHigh = this._highest(rsi, this.options.stochPeriod);
        const rsiLow  = this._lowest(rsi,  this.options.stochPeriod);
        const s = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (!isFinite(rsiHigh[i]) || !isFinite(rsiLow[i]) || !isFinite(rsi[i])) { s[i] = NaN; continue; }
            const range = rsiHigh[i] - rsiLow[i];
            s[i] = range === 0 ? 0 : (rsi[i] - rsiLow[i]) / range * 100;
        }
        this.buffers.stoch = s;
        this.buffers.signal = this._smaRobust(s, this.options.kN);
    }

    visibleRange(viewport, dm) { return { min: 0, max: 100 }; }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.stoch) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (const lvl of [20, 80]) {
            const y = this._priceToY(lvl, viewport, pane);
            ctx.moveTo(0, y); ctx.lineTo(right, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawLine(ctx, viewport, this.buffers.stoch,  this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.signal, this.color2, this.lineWidth, pane);
    }
}
