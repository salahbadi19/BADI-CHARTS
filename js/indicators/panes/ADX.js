/**
 * ADX.js — Average Directional Index (+DI / -DI / ADX, Wilder).
 *
 *   upMove   = high - prevHigh
 *   downMove = prevLow - low
 *   +DM      = upMove > downMove && upMove > 0 ? upMove : 0
 *   -DM      = downMove > upMove && downMove > 0 ? downMove : 0
 *   TR       = max(high - low, |high - prevClose|, |low - prevClose|)
 *   +DI      = 100 * RMA(+DM, n) / RMA(TR, n)
 *   -DI      = 100 * RMA(-DM, n) / RMA(TR, n)
 *   DX       = 100 * |+DI - -DI| / (+DI + -DI)
 *   ADX      = RMA(DX, n)
 *
 * Bounded 0–100 (ADX). Renders +DI / -DI / ADX lines plus 25 reference.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class ADX extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'ADX';
        this.type = 'pane';
        this.color  = opts.color  || '#12C4F0'; // ADX
        this.color2 = opts.color2 || '#16C784'; // +DI
        this.color3 = opts.color3 || '#EA3943'; // -DI
    }
    defaultOptions() { return { period: 14 }; }

    calculate(dm) {
        const { highs, lows, closes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const tr  = new Float64Array(n);
        const pDM = new Float64Array(n);
        const mDM = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (i === 0) {
                tr[i] = highs[i] - lows[i];
                pDM[i] = 0; mDM[i] = 0;
                continue;
            }
            const upMove   = highs[i] - highs[i - 1];
            const downMove = lows[i - 1] - lows[i];
            pDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
            mDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
            const pc = closes[i - 1];
            tr[i] = Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - pc),
                Math.abs(lows[i]  - pc)
            );
        }
        const atr  = this._rma(tr,  p);
        const aPDM = this._rma(pDM, p);
        const aMDM = this._rma(mDM, p);
        const pDI = new Float64Array(n);
        const mDI = new Float64Array(n);
        const dx  = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            if (!isFinite(atr[i]) || atr[i] === 0) { pDI[i] = NaN; mDI[i] = NaN; continue; }
            pDI[i] = 100 * aPDM[i] / atr[i];
            mDI[i] = 100 * aMDM[i] / atr[i];
            const sum = pDI[i] + mDI[i];
            dx[i] = sum === 0 ? 0 : 100 * Math.abs(pDI[i] - mDI[i]) / sum;
        }
        const adx = this._rma(dx, p);
        this.buffers.adx = adx;
        this.buffers.pDI = pDI;
        this.buffers.mDI = mDI;
    }

    visibleRange(viewport, dm) {
        // +DI / -DI / ADX are all bounded 0–100.
        return { min: 0, max: 100 };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.adx) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        const y25 = this._priceToY(25, viewport, pane);
        ctx.moveTo(0, y25); ctx.lineTo(right, y25);
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawLine(ctx, viewport, this.buffers.pDI, this.color2, this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.mDI, this.color3, this.lineWidth, pane);
        this._drawLine(ctx, viewport, this.buffers.adx, this.color,  2,              pane);
    }
}
