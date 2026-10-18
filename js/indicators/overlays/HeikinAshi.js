/**
 * HeikinAshi.js
 * Heikin-Ashi candle overlay.
 *
 *   HA_close[i] = (open[i] + high[i] + low[i] + close[i]) / 4
 *   HA_open[0]  = (open[0] + close[0]) / 2
 *   HA_open[i]  = (HA_open[i-1] + HA_close[i-1]) / 2
 *   HA_high[i]  = max(high[i], HA_open[i], HA_close[i])
 *   HA_low[i]   = min(low[i],  HA_open[i], HA_close[i])
 *
 * Drawn as semi-transparent candles on top of the real candles; up candles
 * (HA_close >= HA_open) use color3, down candles use color2.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class HeikinAshi extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'HeikinAshi';
        this.type = 'overlay';
        this.color2 = opts.color2 || '#EA3943'; // down
        this.color3 = opts.color3 || '#16C784'; // up
    }
    defaultOptions() { return { bodyRatio: 0.6, opacity: 0.55 }; }

    calculate(dm) {
        const { opens, highs, lows, closes } = dm.raw();
        const n = closes.length;
        const ho = new Float64Array(n);
        const hc = new Float64Array(n);
        const hh = new Float64Array(n);
        const hl = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            hc[i] = (opens[i] + highs[i] + lows[i] + closes[i]) / 4;
            if (i === 0) {
                ho[i] = (opens[i] + closes[i]) / 2;
            } else {
                ho[i] = (ho[i - 1] + hc[i - 1]) / 2;
            }
            hh[i] = Math.max(highs[i], ho[i], hc[i]);
            hl[i] = Math.min(lows[i],  ho[i], hc[i]);
        }
        this.buffers.open = ho;
        this.buffers.close = hc;
        this.buffers.high = hh;
        this.buffers.low = hl;
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const { open: ho, close: hc, high: hh, low: hl } = this.buffers;
        if (!ho) return;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(ho.length - 1, Math.ceil(viewport.rightEdge));
        const bodyW = Math.max(1, viewport.barSpacing * this.options.bodyRatio);
        const opacity = this.options.opacity;
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const o = ho[i], c = hc[i], h = hh[i], l = hl[i];
            if (!isFinite(o) || !isFinite(c)) continue;
            const cx = viewport.indexToX(i) + viewport.barSpacing / 2;
            const isUp = c >= o;
            const bodyColor = isUp ? this.color3 : this.color2;
            const wickColor = this._withAlpha(bodyColor, 0.9);
            const bodyFill  = this._withAlpha(bodyColor, opacity);
            // Wick.
            const yH = this._priceToY(h, viewport, pane);
            const yL = this._priceToY(l, viewport, pane);
            ctx.strokeStyle = wickColor;
            ctx.lineWidth = Math.max(0.5, viewport.barSpacing * 0.1);
            ctx.beginPath();
            ctx.moveTo(cx, yH);
            ctx.lineTo(cx, yL);
            ctx.stroke();
            // Body.
            const yO = this._priceToY(o, viewport, pane);
            const yC = this._priceToY(c, viewport, pane);
            const top = Math.min(yO, yC);
            const bh = Math.max(1, Math.abs(yC - yO));
            ctx.fillStyle = bodyFill;
            ctx.strokeStyle = wickColor;
            ctx.lineWidth = 1;
            ctx.fillRect(cx - bodyW / 2, top, bodyW, bh);
            ctx.strokeRect(cx - bodyW / 2, top, bodyW, bh);
        }
        ctx.restore();
    }
}
