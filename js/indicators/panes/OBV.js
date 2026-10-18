/**
 * OBV.js — On Balance Volume.
 *
 *   OBV[0] = 0
 *   OBV[i] = OBV[i-1] + volume[i]   if close[i] > close[i-1]
 *          = OBV[i-1] - volume[i]   if close[i] < close[i-1]
 *          = OBV[i-1]               otherwise
 *
 * Cumulative volume line. Autoscales from visible data.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class OBV extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'OBV';
        this.type = 'pane';
        this.color = opts.color || '#ff9800';
    }
    defaultOptions() { return {}; }

    calculate(dm) {
        const { closes, volumes } = dm.raw();
        const n = closes.length;
        const obv = new Float64Array(n);
        let acc = 0;
        for (let i = 0; i < n; i++) {
            if (i > 0) {
                if (closes[i] > closes[i - 1]) acc += volumes[i];
                else if (closes[i] < closes[i - 1]) acc -= volumes[i];
            }
            obv[i] = acc;
        }
        this.buffers.obv = obv;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.obv;
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
        const pad = (max - min) * 0.05 || 1;
        return { min: min - pad, max: max + pad };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        if (!this.buffers.obv) return;
        const right = viewport.width - 70;
        ctx.strokeStyle = theme.gridLine || '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = this._priceToY(0, viewport, pane);
        ctx.moveTo(0, y0); ctx.lineTo(right, y0);
        ctx.stroke();
        this._drawLine(ctx, viewport, this.buffers.obv, this.color, this.lineWidth, pane);
    }
}
