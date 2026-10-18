/**
 * TextDrawing.js - Floating text annotation.
 */
import { DrawingBase } from './DrawingBase.js';

export class TextDrawing extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'text';
        this.text = opts.text || 'Note';
        this.color = opts.color || '#ffffff';
        this.fillColor = opts.fillColor || '#12C4F0';
        this.fontSize = opts.fontSize || 12;
        this.padding = 6;
        this.showText = true;
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = true;
        }
    }
    onPointerMove(x, y, vp) {}
    onPointerUp(x, y, vp) {}
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 1 || !this.text) return;
        const p = this._anchorToScreen(this.anchors[0], vp);
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.font = `${this.fontSize}px 'Inter', sans-serif`;
        const m = ctx.measureText(this.text);
        const w = m.width + this.padding * 2, h = this.fontSize + this.padding * 2;
        ctx.fillStyle = this.fillColor;
        ctx.fillRect(p.x, p.y - h, w, h);
        if (this.isSelected || this.isHovered) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x + 0.5, p.y - h + 0.5, w, h);
        }
        ctx.fillStyle = this.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, p.x + this.padding, p.y - h / 2);
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 1) return false;
        const p = this._anchorToScreen(this.anchors[0], vp);
        ctx.font = `${this.fontSize}px 'Inter', sans-serif`;
        // Approximate text width
        const w = (this.text.length * this.fontSize * 0.6) + this.padding * 2;
        const h = this.fontSize + this.padding * 2;
        return x >= p.x && x <= p.x + w && y >= p.y - h && y <= p.y;
    }
}
