/**
 * WilliamsFractals.js
 * Bill Williams Fractal overlay.
 *
 * A 5-bar (default) up fractal is a bar whose high is greater than the highs
 * of the `n` bars on either side. A down fractal is a bar whose low is less
 * than the lows of the `n` bars on either side.
 *
 * Up fractals are drawn as up-arrows above the bar; down fractals as
 * down-arrows below the bar.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class WilliamsFractals extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'WilliamsFractals';
        this.type = 'overlay';
        this.color2 = opts.color2 || '#EA3943'; // up fractal
        this.color3 = opts.color3 || '#16C784'; // down fractal
    }
    defaultOptions() { return { n: 2 }; }

    calculate(dm) {
        const { highs, lows } = dm.raw();
        const n = highs.length;
        const k = this.options.n;
        const up = new Float64Array(n).fill(NaN);
        const down = new Float64Array(n).fill(NaN);
        for (let i = k; i < n - k; i++) {
            let isUp = true, isDown = true;
            for (let j = 1; j <= k; j++) {
                if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) isUp = false;
                if (lows[i]  >= lows[i - j]  || lows[i]  >= lows[i + j])  isDown = false;
            }
            if (isUp)   up[i]   = highs[i];
            if (isDown) down[i] = lows[i];
        }
        this.buffers.up = up;
        this.buffers.down = down;
    }

    _drawArrow(ctx, x, y, size, up, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        if (up) {
            // Up arrow pointing up, tip above `y`.
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size * 0.6, y);
            ctx.lineTo(x + size * 0.6, y);
        } else {
            // Down arrow pointing down, tip below `y`.
            ctx.moveTo(x, y + size);
            ctx.lineTo(x - size * 0.6, y);
            ctx.lineTo(x + size * 0.6, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const up = this.buffers.up;
        const down = this.buffers.down;
        if (!up || !down) return;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(up.length - 1, Math.ceil(viewport.rightEdge));
        const size = Math.max(3, viewport.barSpacing * 0.4);
        ctx.save();
        this._clipToPane(ctx, viewport, pane);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            if (isFinite(up[i])) {
                const y = this._priceToY(up[i], viewport, pane);
                this._drawArrow(ctx, x, y - 4, size, true, this.color2);
            }
            if (isFinite(down[i])) {
                const y = this._priceToY(down[i], viewport, pane);
                this._drawArrow(ctx, x, y + 4, size, false, this.color3);
            }
        }
        ctx.restore();
    }
}
