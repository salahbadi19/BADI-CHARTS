/**
 * FibChannel.js - Fibonacci channel (parallel lines through two anchors + fib levels).
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

const _FC_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618];

export class FibChannel extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'fibchannel';
        this.lineWidth = opts.lineWidth || 1;
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
            this.isComplete = true;
        }
    }
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 2) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const dy = p2.y - p1.y;
        ctx.save();
        ctx.font = "10px 'JetBrains Mono', monospace";
        for (const fl of _FC_LEVELS) {
            const y = p1.y + dy * fl;
            ctx.strokeStyle = fl === 0.5 ? '#4caf50' : (fl === 0.618 ? '#16C784' : '#888');
            ctx.lineWidth = fl === 0.618 ? this.lineWidth + 0.5 : this.lineWidth;
            this._applyLineStyle(ctx);
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(vp.width - 70, y + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);
            const lbl = `${(fl * 100).toFixed(1)}%`;
            const m = ctx.measureText(lbl);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillRect(vp.width - 70 - m.width - 8, y - 7, m.width + 8, 14);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(lbl, vp.width - 75, y);
        }
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, p1.y, theme);
            this._drawHandle(ctx, p2.x, p2.y, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const dy = p2.y - p1.y;
        for (const fl of _FC_LEVELS) {
            const yLine = p1.y + dy * fl;
            if (Math.abs(y - yLine) <= this._hitTolerance && x < vp.width - 70) return true;
        }
        return false;
    }
}
