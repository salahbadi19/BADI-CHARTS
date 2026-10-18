/**
 * CMF.js — Chaikin Money Flow.
 *
 *   MFV[i]  = CLV * volume,   CLV = ((close - low) - (high - close)) / (high - low)
 *   CMF[i]  = sum(MFV, n) / sum(volume, n)
 *
 * Oscillates around 0 (typically -1 to +1). Renders a 0 reference line.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class CMF extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'CMF';
        this.type = 'pane';
        this.color = opts.color || '#12C4F0';
    }
    defaultOptions() { return { period: 20 }; }

    calculate(dm) {
        const { highs, lows, closes, volumes } = dm.raw();
        const n = closes.length;
        const p = this.options.period;
        const mfv = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const range = highs[i] - lows[i];
            const clv = range === 0 ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / range;
            mfv[i] = clv * volumes[i];
        }
        const cmf = new Float64Array(n);
        for (let i = p - 1; i < n; i++) {
            let sm = 0, sv = 0;
            for (let j = i - p + 1; j <= i; j++) { sm += mfv[j]; sv += volumes[j]; }
            cmf[i] = sv === 0 ? 0 : sm / sv;
        }
        this.buffers.cmf = cmf;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.cmf;
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
        const pad = (max - min) * 0.1 || 0.1;
        return { min: min - pad, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.cmf) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.cmf, this.color, this.lineWidth, pane);
    }
}
