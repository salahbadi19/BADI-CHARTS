/**
 * ZigZag.js
 * Pivot-based ZigZag overlay.
 *
 * Walks the bars and identifies significant swing highs / lows where price
 * retraced by at least `percent` % from the prior pivot. Draws straight line
 * segments connecting consecutive pivots and marks each pivot with a dot.
 *
 * Implementation:
 *   - Scan forward to find the first swing whose total range exceeds the
 *     threshold; that establishes the first two pivots (low then high, or
 *     high then low) and the initial search direction.
 *   - From the last pivot, track the running extreme in the current search
 *     direction. When the opposite extreme retraces by `percent` from the
 *     running extreme, lock in a new pivot and reverse direction.
 *   - The in-progress (unconfirmed) running extreme is appended as a final
 *     pivot so the line extends to the latest bar.
 */
import { IndicatorBase } from '../IndicatorBase.js';

export class ZigZag extends IndicatorBase {
    constructor(opts = {}) {
        super(opts);
        this.name = 'ZigZag';
        this.type = 'overlay';
        this.color  = opts.color  || '#12C4F0'; // line
        this.color2 = opts.color2 || '#EA3943'; // pivot dots
    }
    defaultOptions() { return { percent: 5 }; }

    calculate(dm) {
        const { highs, lows } = dm.raw();
        const n = highs.length;
        const out = new Float64Array(n).fill(NaN); // NaN except at pivot indices
        const pivots = [];
        const thr = this.options.percent / 100;
        if (n === 0) { this.buffers.zigzag = out; this.buffers.pivots = pivots; return; }

        // 1) Find the initial pair of pivots.
        let h = highs[0], hIdx = 0, l = lows[0], lIdx = 0;
        let found = false;
        for (let i = 1; i < n; i++) {
            if (highs[i] > h) { h = highs[i]; hIdx = i; }
            if (lows[i]  < l) { l = lows[i];  lIdx = i; }
            if (h > 0 && (h - l) / h >= thr) {
                if (lIdx < hIdx) {
                    pivots.push({ index: lIdx, price: l, type: 'low'  });
                    pivots.push({ index: hIdx, price: h, type: 'high' });
                } else {
                    pivots.push({ index: hIdx, price: h, type: 'high' });
                    pivots.push({ index: lIdx, price: l, type: 'low'  });
                }
                found = true;
                break;
            }
        }
        if (!found) { this.buffers.zigzag = out; this.buffers.pivots = pivots; return; }

        // 2) Continue from the last pivot.
        let last = pivots[pivots.length - 1];
        let dir = last.type === 'low' ? 1 : -1; // 1 = searching for high, -1 = searching for low
        let curExt = last.price;
        let curExtIdx = last.index;

        for (let i = last.index + 1; i < n; i++) {
            if (dir === 1) {
                if (highs[i] > curExt) { curExt = highs[i]; curExtIdx = i; }
                const retrace = curExt > 0 ? (curExt - lows[i]) / curExt : 0;
                if (retrace >= thr) {
                    pivots.push({ index: curExtIdx, price: curExt, type: 'high' });
                    curExt = lows[i]; curExtIdx = i;
                    dir = -1;
                }
            } else {
                if (lows[i] < curExt) { curExt = lows[i]; curExtIdx = i; }
                const retrace = curExt > 0 ? (highs[i] - curExt) / curExt : 0;
                if (retrace >= thr) {
                    pivots.push({ index: curExtIdx, price: curExt, type: 'low' });
                    curExt = highs[i]; curExtIdx = i;
                    dir = 1;
                }
            }
        }
        // Append the in-progress extreme so the line extends to the latest bar.
        if (curExtIdx !== last.index) {
            pivots.push({ index: curExtIdx, price: curExt, type: dir === 1 ? 'high' : 'low' });
        }

        for (const p of pivots) {
            if (p.index >= 0 && p.index < n) out[p.index] = p.price;
        }
        this.buffers.zigzag = out;
        this.buffers.pivots = pivots;
    }

    draw(ctx, viewport, dm, pane, theme) {
        this.ensureCalculated(dm);
        const pivots = this.buffers.pivots;
        if (!pivots || pivots.length < 2) return;
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.ceil(viewport.rightEdge);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.setLineDash([]);
        ctx.beginPath();
        let started = false;
        for (const p of pivots) {
            if (p.index < leftIdx - 1 || p.index > rightIdx + 1) continue;
            const x = viewport.indexToX(p.index) + viewport.barSpacing / 2;
            const y = this._priceToY(p.price, viewport, pane);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Pivot dots.
        ctx.fillStyle = this.color2;
        const r = Math.max(2, viewport.barSpacing * 0.15);
        for (const p of pivots) {
            if (p.index < leftIdx - 1 || p.index > rightIdx + 1) continue;
            const x = viewport.indexToX(p.index) + viewport.barSpacing / 2;
            const y = this._priceToY(p.price, viewport, pane);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
