/**
 * ArrowMarker.js — A drawing tool that places arrow ICONS above or below
 * candles. The user can choose from multiple icon types (up arrow, down
 * arrow, star, flag, etc.) and the icon is placed at the click position.
 *
 * This is registered in the DrawingToolRegistry like other drawing tools.
 */
import { DrawingBase } from './DrawingBase.js';

export class ArrowMarker extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'arrowmarker';
        this.color = opts.color || '#12C4F0';
        this.iconType = opts.iconType || 'arrowUp'; // arrowUp, arrowDown, star, flag, dot, diamond
        this.size = opts.size || 14;
    }

    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = true;
        }
    }
    onPointerMove() {}
    onPointerUp() {}

    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 1) return;
        const p = this._anchorToScreen(this.anchors[0], vp);
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(p.x, p.y);
        const s = this.size;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        switch (this.iconType) {
            case 'arrowUp':
                // Up-pointing triangle arrow
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(-s * 0.6, s * 0.3);
                ctx.lineTo(-s * 0.25, s * 0.3);
                ctx.lineTo(-s * 0.25, s * 0.7);
                ctx.lineTo(s * 0.25, s * 0.7);
                ctx.lineTo(s * 0.25, s * 0.3);
                ctx.lineTo(s * 0.6, s * 0.3);
                ctx.closePath();
                ctx.fill();
                break;
            case 'arrowDown':
                ctx.beginPath();
                ctx.moveTo(0, s);
                ctx.lineTo(-s * 0.6, -s * 0.3);
                ctx.lineTo(-s * 0.25, -s * 0.3);
                ctx.lineTo(-s * 0.25, -s * 0.7);
                ctx.lineTo(s * 0.25, -s * 0.7);
                ctx.lineTo(s * 0.25, -s * 0.3);
                ctx.lineTo(s * 0.6, -s * 0.3);
                ctx.closePath();
                ctx.fill();
                break;
            case 'star':
                // 5-pointed star
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
                    const r = (i % 2 === 0) ? s : s * 0.4;
                    const px = Math.cos(angle) * r;
                    const py = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                break;
            case 'flag':
                // Flag on a pole
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(0, s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.8, -s * 0.7);
                ctx.lineTo(0, -s * 0.4);
                ctx.closePath();
                ctx.fill();
                break;
            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.6, 0);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                break;
            case 'dot':
            default:
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Ring around it
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }

        // Label
        if (this.showText && this.text) {
            ctx.translate(-p.x, -p.y); // undo translate for text positioning
            ctx.fillStyle = this.color;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(this.text, p.x, p.y - this.size - 4);
        }

        // Selection handle
        if (this.isSelected || this.isHovered) {
            ctx.translate(-p.x, -p.y);
            this._drawHandle(ctx, p.x, p.y, theme);
        }
        ctx.restore();
    }

    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 1) return false;
        const p = this._anchorToScreen(this.anchors[0], vp);
        const dx = x - p.x, dy = y - p.y;
        return dx * dx + dy * dy <= (this.size + 4) * (this.size + 4);
    }

    toJSON() {
        const json = super.toJSON();
        json.iconType = this.iconType;
        json.size = this.size;
        return json;
    }
}
