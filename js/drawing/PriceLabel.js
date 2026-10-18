/**
 * PriceLabel.js - A tag-style label anchored to a price level on the right axis.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class PriceLabel extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'pricelabel';
        this.color = opts.color || '#12C4F0';
        this.text = opts.text || '';
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = true;
            if (!this.text) this.text = prompt('Label text:', MathUtils.formatPrice(this.anchors[0].price)) || '';
        }
    }
    onPointerMove(x, y, vp) {}
    onPointerUp(x, y, vp) {}
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 1) return;
        const y = vp.priceToY(this.anchors[0].price);
        if (y < 0 || y > vp.priceHeight) return;
        ctx.save();
        const label = this.text || MathUtils.formatPrice(this.anchors[0].price);
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        const m = ctx.measureText(label);
        const w = m.width + 16, h = 18;
        const x = vp.width - 70 - w;
        // Line
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(x, y + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        // Tag
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y - h / 2, w, h);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y);
        if (this.isSelected || this.isHovered) this._drawHandle(ctx, x + w / 2, y, theme);
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 1) return false;
        const yLine = vp.priceToY(this.anchors[0].price);
        return Math.abs(y - yLine) <= this._hitTolerance;
    }
}
