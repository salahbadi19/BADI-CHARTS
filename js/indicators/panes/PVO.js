/**
 * PVO.js — Percentage Volume Oscillator.
 *
 * Same construction as PPO, but applied to the volume series:
 *   PVO    = (EMA(volume, fast) - EMA(volume, slow)) / EMA(volume, slow) * 100
 *   Signal = EMA(PVO, signalN)
 *   Hist   = PVO - Signal
 *
 * Renders PVO + Signal lines plus a zero-centred Hist histogram.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class PVO extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'PVO';
        this.type = 'pane';
        this.color  = opts.color  || '#12C4F0'; // PVO
        this.color2 = opts.color2 || '#EA3943'; // Signal
        this.color3 = opts.color3 || '#16C784'; // Hist up
    }
    defaultOptions() { return { fast: 12, slow: 26, signal: 9 }; }

    _emaRobust(src, period) {
        const n = src.length;
        const out = new Float64Array(n);
        const k = 2 / (period + 1);
        let prev = NaN, count = 0, seedSum = 0;
        for (let i = 0; i < n; i++) {
            const v = src[i];
            if (!isFinite(v)) { out[i] = NaN; continue; }
            count++;
            if (count < period) { seedSum += v; out[i] = NaN; }
            else if (count === period) { seedSum += v; prev = seedSum / period; out[i] = prev; }
            else { prev = v * k + prev * (1 - k); out[i] = prev; }
        }
        return out;
    }

    calculate(dm) {
        const { volumes } = dm.raw();
        const n = volumes.length;
        const emaFast = this._ema(volumes, this.options.fast);
        const emaSlow = this._ema(volumes, this.options.slow);
        const pvo = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (isFinite(emaFast[i]) && isFinite(emaSlow[i]) && emaSlow[i] !== 0) {
                pvo[i] = (emaFast[i] - emaSlow[i]) / emaSlow[i] * 100;
            } else pvo[i] = NaN;
        }
        const signal = this._emaRobust(pvo, this.options.signal);
        const hist = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            hist[i] = (isFinite(pvo[i]) && isFinite(signal[i])) ? pvo[i] - signal[i] : NaN;
        }
        this.buffers.pvo = pvo;
        this.buffers.signal = signal;
        this.buffers.hist = hist;
    }

    _scan(viewport, bufs) {
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min((bufs[0]?.length || 0) - 1, Math.ceil(viewport.rightEdge));
        let min = Infinity, max = -Infinity;
        for (const b of bufs) {
            if (!b) continue;
            for (let i = left; i <= right; i++) {
                const v = b[i];
                if (isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
            }
        }
        if (!isFinite(min) || !isFinite(max)) return { min: -1, max: 1 };
        if (min > 0) min = 0;
        if (max < 0) max = 0;
        const pad = (max - min) * 0.1 || 1;
        return { min: min - pad, max: max + pad };
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        return this._scan(viewport, [this.buffers.pvo, this.buffers.signal, this.buffers.hist]);
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.pvo) return;
        const right = viewport.width - 70;
        const y0 = this._priceToY(0, viewport, pane);
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        const hist = this.buffers.hist;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(hist.length - 1, Math.ceil(viewport.rightEdge));
        const bw = Math.max(1, viewport.barSpacing * 0.7);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = hist[i];
            if (!isFinite(v)) continue;
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const yv = this._priceToY(v, viewport, pane);
            const top = Math.min(yv, y0);
            const h = Math.abs(yv - y0);
            const rising = i > 0 && isFinite(hist[i - 1]) && v >= hist[i - 1];
            const positive = v >= 0;
            ctx.fillStyle = positive
                ? (rising ? this.color3 : this._withAlpha(this.color3, 0.5))
                : (rising ? this._withAlpha(this.color2, 0.5) : this.color2);
            ctx.fillRect(x - bw / 2, top, bw, Math.max(1, h));
        }
        this._drawLine(ctx, viewport, this.buffers.pvo,    this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.signal, this.color2, this.lineWidth, pane);
        ctx.restore();
    }
}
