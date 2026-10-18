/**
 * ShortPosition.js - Mirror of LongPosition for short trades.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class ShortPosition extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'shortpos';
        this.color = opts.color || '#EA3943';
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp)); // entry
            this.anchors.push({ index: this.anchors[0].index + 30, price: this.anchors[0].price * 0.98 }); // target (lower)
            this.anchors.push({ index: this.anchors[0].index + 30, price: this.anchors[0].price * 1.02 }); // stop (higher)
            this.isComplete = true;
        } else {
            this.anchors[0] = this._screenToAnchor(x, y, vp);
        }
    }
    onPointerMove(x, y, vp) {}
    onPointerUp(x, y, vp) {}
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 3) return;
        const entry = this.anchors[0], target = this.anchors[1], stop = this.anchors[2];
        const x1 = vp.indexToX(entry.index) + vp.barSpacing / 2;
        const x2 = vp.indexToX(target.index) + vp.barSpacing / 2;
        const yEntry = vp.priceToY(entry.price);
        const yTarget = vp.priceToY(target.price);
        const yStop = vp.priceToY(stop.price);
        ctx.save();
        // Profit zone (target is below entry for short)
        ctx.fillStyle = 'rgba(22, 199, 132, 0.18)';
        ctx.fillRect(x1, yEntry, x2 - x1, yTarget - yEntry);
        // Loss zone (stop is above entry)
        ctx.fillStyle = 'rgba(234, 57, 67, 0.18)';
        ctx.fillRect(x1, yStop, x2 - x1, yEntry - yStop);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x1, yEntry); ctx.lineTo(x2, yEntry); ctx.stroke();
        ctx.strokeStyle = '#16C784';
        ctx.beginPath(); ctx.moveTo(x1, yTarget); ctx.lineTo(x2, yTarget); ctx.stroke();
        ctx.strokeStyle = '#EA3943';
        ctx.beginPath(); ctx.moveTo(x1, yStop); ctx.lineTo(x2, yStop); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = this.color;
        ctx.beginPath(); ctx.moveTo(x1, yTarget); ctx.lineTo(x1, yStop); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, yTarget); ctx.lineTo(x2, yStop); ctx.stroke();
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const risk = stop.price - entry.price;
        const reward = entry.price - target.price;
        const rr = reward / risk;
        ctx.fillStyle = '#16C784';
        ctx.fillText(`T ${MathUtils.formatPrice(target.price)}`, x2 + 4, yTarget + 4);
        ctx.fillStyle = this.color;
        ctx.fillText(`E ${MathUtils.formatPrice(entry.price)}`, x2 + 4, yEntry + 4);
        ctx.fillStyle = '#EA3943';
        ctx.fillText(`S ${MathUtils.formatPrice(stop.price)}`, x2 + 4, yStop + 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x2 + 4, (yTarget + yStop) / 2 - 7, 50, 14);
        ctx.fillStyle = rr >= 1 ? '#16C784' : '#EA3943';
        ctx.textAlign = 'center';
        ctx.fillText(`R:R ${rr.toFixed(2)}`, x2 + 29, (yTarget + yStop) / 2);
        if (this.isSelected || this.isHovered) {
            this._drawHandle(ctx, x1, yEntry, theme);
            this._drawHandle(ctx, x2, yTarget, theme);
            this._drawHandle(ctx, x2, yStop, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 3) return false;
        const entry = this.anchors[0], target = this.anchors[1], stop = this.anchors[2];
        const x1 = vp.indexToX(entry.index) + vp.barSpacing / 2;
        const x2 = vp.indexToX(target.index) + vp.barSpacing / 2;
        return x >= x1 - 5 && x <= x2 + 60 && y >= vp.priceToY(target.price) - 5 && y <= vp.priceToY(stop.price) + 5;
    }
}
