/**
 * FibExtension.js - Fibonacci extension (projection from a swing).
 * Three anchors: swing low → swing high → retrace low.
 * Levels projected from retrace low using the swing range.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

const LEVELS = [
    { l: 0,    c: '#888' },  { l: 0.618, c: '#16C784' },
    { l: 1,    c: '#888' },  { l: 1.618, c: '#9c27b0' },
    { l: 2.618, c: '#673ab7' }, { l: -0.272, c: '#ff9800' },
    { l: -0.618, c: '#EA3943' }
];

export class FibExtension extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'fibext';
        this.lineWidth = opts.lineWidth || 1;
        this._step = 1;
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = false;
            this._step = 1;
        } else if (!this.isComplete && this._step < 3) {
            this.anchors[this._step] = this._screenToAnchor(x, y, vp);
            this._step++;
            if (this._step === 3) this.isComplete = true;
        }
    }
    onPointerMove(x, y, vp) {
        if (!this.isComplete && this.anchors[this._step]) this.anchors[this._step] = this._screenToAnchor(x, y, vp);
    }
    onPointerUp(x, y, vp) {}
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 3) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const p3 = this._anchorToScreen(this.anchors[2], vp);
        const range = this.anchors[1].price - this.anchors[0].price;
        const xLeft = Math.min(p1.x, p2.x, p3.x);
        const xRight = vp.width - 70;
        ctx.save();
        ctx.font = "10px 'JetBrains Mono', monospace";
        for (const fl of LEVELS) {
            const price = this.anchors[2].price + range * fl.l;
            const y = vp.priceToY(price);
            ctx.strokeStyle = fl.c;
            ctx.lineWidth = this.lineWidth;
            this._applyLineStyle(ctx);
            ctx.beginPath();
            ctx.moveTo(xLeft, y + 0.5);
            ctx.lineTo(xRight, y + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);
            const lbl = `${(fl.l * 100).toFixed(1)}%  ${MathUtils.formatPrice(price)}`;
            const m = ctx.measureText(lbl);
            ctx.fillStyle = fl.c;
            ctx.fillRect(xRight - m.width - 10, y - 7, m.width + 10, 14);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(lbl, xRight - 5, y);
        }
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, p1.y, theme);
            this._drawHandle(ctx, p2.x, p2.y, theme);
            this._drawHandle(ctx, p3.x, p3.y, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 3) return false;
        const range = this.anchors[1].price - this.anchors[0].price;
        for (const fl of LEVELS) {
            const yLine = vp.priceToY(this.anchors[2].price + range * fl.l);
            if (Math.abs(y - yLine) <= this._hitTolerance && x < vp.width - 70) return true;
        }
        return false;
    }
}
