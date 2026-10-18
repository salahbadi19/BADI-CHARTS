/**
 * KST.js — Know Sure Thing.
 *
 *   ROC1 = ROC(close, 10);  RCMA1 = SMA(ROC1, 10)
 *   ROC2 = ROC(close, 15);  RCMA2 = SMA(ROC2, 10)
 *   ROC3 = ROC(close, 20);  RCMA3 = SMA(ROC3, 10)
 *   ROC4 = ROC(close, 30);  RCMA4 = SMA(ROC4, 15)
 *   KST    = RCMA1 + RCMA2 - RCMA3 - RCMA4
 *   Signal = SMA(KST, 9)
 *
 * Oscillates around 0. Renders KST + Signal plus a 0 reference.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class KST extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'KST';
        this.type = 'pane';
        this.color  = opts.color  || '#12C4F0'; // KST
        this.color2 = opts.color2 || '#EA3943'; // Signal
    }
    defaultOptions() {
        return {
            roc1: 10, roc2: 15, roc3: 20, roc4: 30,
            sma1: 10, sma2: 10, sma3: 10, sma4: 15,
            signal: 9
        };
    }

    _roc(closes, period) {
        const n = closes.length;
        const out = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (i >= period && closes[i - period] !== 0) out[i] = (closes[i] - closes[i - period]) / closes[i - period] * 100;
            else out[i] = NaN;
        }
        return out;
    }

    calculate(dm) {
        const { closes } = dm.raw();
        const o = this.options;
        const r1 = this._roc(closes, o.roc1);
        const r2 = this._roc(closes, o.roc2);
        const r3 = this._roc(closes, o.roc3);
        const r4 = this._roc(closes, o.roc4);
        // ROC has leading NaN, so use _smaRobust to keep the SMA seed finite.
        const m1 = this._smaRobust(r1, o.sma1);
        const m2 = this._smaRobust(r2, o.sma2);
        const m3 = this._smaRobust(r3, o.sma3);
        const m4 = this._smaRobust(r4, o.sma4);
        const n = closes.length;
        const kst = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (isFinite(m1[i]) && isFinite(m2[i]) && isFinite(m3[i]) && isFinite(m4[i])) {
                kst[i] = m1[i] + m2[i] - m3[i] - m4[i];
            } else kst[i] = NaN;
        }
        this.buffers.kst = kst;
        this.buffers.signal = this._smaRobust(kst, o.signal);
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const bufs = [this.buffers.kst, this.buffers.signal];
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

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.kst) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.kst,    this.color,  this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.signal, this.color2, this.lineWidth, pane);
    }
}
