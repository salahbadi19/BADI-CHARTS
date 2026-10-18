/**
 * Volume.js — Volume pane.
 *
 * Renders volume bars colour-coded by candle direction
 *   (close >= open => up color, else down color).
 * Autoscales from visible data (min forced to 0).
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class Volume extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'Volume';
        this.type = 'pane';
        this.color  = opts.color  || '#16C784'; // up
        this.color2 = opts.color2 || '#EA3943'; // down
    }
    defaultOptions() { return {}; }

    calculate(dm) {
        const { volumes } = dm.raw();
        this.buffers.volume = volumes;
    }

    visibleRange(viewport, dm) {
        this.ensureCalculated(dm);
        const buf = this.buffers.volume;
        if (!buf) return { min: 0, max: 1 };
        const left = Math.max(0, Math.floor(viewport.leftEdge));
        const right = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        let max = 0;
        for (let i = left; i <= right; i++) {
            const v = buf[i];
            if (isFinite(v) && v > max) max = v;
        }
        if (max === 0) max = 1;
        return { min: 0, max: max * 1.1 };
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const buf = this.buffers.volume;
        if (!buf) return;
        const { opens, closes } = dm.raw();
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        const y0 = this._priceToY(0, viewport, pane);
        const bw = Math.max(1, viewport.barSpacing * 0.7);
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = buf[i];
            if (!isFinite(v) || v <= 0) continue;
            const yv = this._priceToY(v, viewport, pane);
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const up = closes[i] >= opens[i];
            ctx.fillStyle = this._withAlpha(up ? this.color : this.color2, 0.7);
            ctx.fillRect(x - bw / 2, yv, bw, Math.max(0, y0 - yv));
        }
        ctx.restore();
    }
}


