/**
 * MFI.js — Money Flow Index (volume-weighted RSI).
 *
 *   TP   = (high + low + close) / 3
 *   MF   = TP * volume
 *   posMF = MF if TP > prevTP else 0
 *   negMF = MF if TP < prevTP else 0
 *   MFI  = 100 - 100 / (1 + sum(posMF, n) / sum(negMF, n))
 *
 * Bounded 0–100. Renders 20 / 80 reference lines plus MFI.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class MFI extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'MFI';
        this.type = 'pane';
        this.color = opts.color || '#00bcd4';
    }
    defaultOptions() { return { period: 14 }; }

    calculate(dm) {
        const { highs, lows, closes, volumes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const tp = new Float64Array(n);
        const posMF = new Float64Array(n);
        const negMF = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            tp[i] = (highs[i] + lows[i] + closes[i]) / 3;
            const mf = tp[i] * volumes[i];
            if (i > 0) {
                if (tp[i] > tp[i - 1]) posMF[i] = mf;
                else if (tp[i] < tp[i - 1]) negMF[i] = mf;
            }
        }
        const mfi = new Float64Array(n);
        for (let i = p; i < n; i++) {
            let sp = 0, sn = 0;
            for (let j = i - p + 1; j <= i; j++) { sp += posMF[j]; sn += negMF[j]; }
            mfi[i] = sn === 0 ? 100 : 100 - 100 / (1 + sp / sn);
        }
        this.buffers.mfi = mfi;
    }

    visibleRange(viewport, dm) { return { min: 0, max: 100 }; }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.mfi) return;
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
        this._drawLine(ctx, viewport, this.buffers.mfi, this.color, this.lineWidth, pane);
    }
}
