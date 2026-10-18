/**
 * ChaikinOsc.js — Chaikin Oscillator.
 *
 *   CLV     = ((close - low) - (high - close)) / (high - low)
 *   ADL[i]  = ADL[i-1] + CLV * volume
 *   Chaikin = EMA(ADL, 3) - EMA(ADL, 10)
 *
 * Oscillates around 0. Renders a 0 reference line plus the oscillator.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class ChaikinOsc extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'ChaikinOsc';
        this.type = 'pane';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { fast: 3, slow: 10 }; }

    calculate(dm) {
        const { highs, lows, closes, volumes } = dm.raw();
        const n = closes.length;
        const adl = new Float64Array(n);
        let acc = 0;
        for (let i = 0; i < n; i++) {
            const range = highs[i] - lows[i];
            const clv = range === 0 ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / range;
            acc += clv * volumes[i];
            adl[i] = acc;
        }
        const emaFast = this._ema(adl, this.options.fast);
        const emaSlow = this._ema(adl, this.options.slow);
        const out = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            out[i] = (isFinite(emaFast[i]) && isFinite(emaSlow[i])) ? emaFast[i] - emaSlow[i] : NaN;
        }
        this.buffers.chaikin = out;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.chaikin;
        if (!buf) return { min: -1, max: 1 };
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        let min = Infinity, max = -Infinity;
        for (let i = left; i <= right; i++) {
            const v = buf[i];
            if (isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
        }
        if (!isFinite(min) || !isFinite(max)) return { min: -1, max: 1 };
        if (min > 0) min = 0;
        if (max < 0) max = 0;
        const pad = (max - min) * 0.1 || 1;
        return { min: min - pad, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.chaikin) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.chaikin, this.color, this.lineWidth, pane);
    }
}
