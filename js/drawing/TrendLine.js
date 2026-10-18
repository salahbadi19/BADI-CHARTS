/**
 * TrendLine.js - Two-point line with optional extension and price label.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class TrendLine extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'trendline';
        this.extend = opts.extend || false;
        this.showLabels = opts.showLabels !== false;
        this.color = opts.color || '#12C4F0';
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = false;
        }
    }
    onPointerMove(x, y, vp) {
        if (!this.isComplete && this.anchors.length === 2) this.anchors[1] = this._screenToAnchor(x, y, vp);
    }
    onPointerUp(x, y, vp) {
        if (!this.isComplete) {
            this.anchors[1] = this._screenToAnchor(x, y, vp);
            if (Math.abs(this.anchors[0].index - this.anchors[1].index) > 0.3 || Math.abs(this.anchors[0].price - this.anchors[1].price) > 1e-6) {
                this.isComplete = true;
            }
        }
    }
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 2) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        let x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
        if (this.extend) {
            const dx = x2 - x1, dy = y2 - y1;
            if (Math.abs(dx) > 0.001) {
                const tR = (vp.width - 70 - x1) / dx;
                const tL = -x1 / dx;
                x2 = x1 + dx * tR; y2 = y1 + dy * tR;
                x1 = x1 + dx * tL; y1 = y1 + dy * tL;
            }
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.showLabels) this._drawPriceLabel(ctx, p2.x, p2.y, this.anchors[1].price);
        if (this.showText) this._drawTextLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, theme);
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, p1.y, theme);
            this._drawHandle(ctx, p2.x, p2.y, theme);
        }
        ctx.restore();
    }
    _drawPriceLabel(ctx, x, y, price, theme) {
        const label = MathUtils.formatPrice(price);
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const m = ctx.measureText(label);
        const w = m.width + 10, h = 16;
        ctx.fillStyle = this.color;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return MathUtils.distance(x, y, p1.x, p1.y) <= this._hitTolerance;
        let t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
        if (!this.extend) t = Math.max(0, Math.min(1, t));
        return MathUtils.distance(x, y, p1.x + t * dx, p1.y + t * dy) <= this._hitTolerance;
    }
}
