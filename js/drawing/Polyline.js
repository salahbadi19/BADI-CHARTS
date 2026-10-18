/**
 * Polyline.js - Multi-point polyline.
 *
 * Interaction (TradingView-style):
 *   - Click to ADD a point.
 *   - Double-click to FINISH the polyline (if ≥ 2 points exist).
 *   - Press Esc to CANCEL the in-progress polyline.
 *   - Press Enter to FINISH (same as double-click).
 *
 * FIX (user-reported bug): previously the polyline never stopped following the
 * cursor — even after a single click, the last segment kept tracking the
 * mouse because `onPointerMove` always pushed a preview anchor. The fix
 * introduces an explicit `isDrawing` flag and a `finish()` method that the
 * DrawingManager calls on double-click / Enter. The preview anchor is
 * removed cleanly when the drawing is finished.
 */
import { DrawingBase } from './DrawingBase.js';

export class Polyline extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'polyline';
        this.color = opts.color || '#12C4F0';
        this._hasPreview = false; // true while the last anchor is a live preview
    }

    onPointerDown(x, y, vp) {
        // If we have a preview anchor from the previous move, replace it
        // with a fixed point. Otherwise this is the first point.
        if (this._hasPreview && this.anchors.length > 0) {
            // FIX: if the click is at (almost) the same position as the
            // previous FIXED point, ignore it — this is the second click of
            // a double-click, and we don't want to add a duplicate point.
            const prevFixedIdx = this.anchors.length - 2; // -1 is the preview
            if (prevFixedIdx >= 0) {
                const prev = this._anchorToScreen(this.anchors[prevFixedIdx], vp);
                const dx = x - prev.x, dy = y - prev.y;
                if (dx * dx + dy * dy < 16) { // within 4px
                    // Drop the preview and wait for the dblclick event to finish.
                    this.anchors.pop();
                    this._hasPreview = false;
                    return;
                }
            }
            this.anchors[this.anchors.length - 1] = this._screenToAnchor(x, y, vp);
            this._hasPreview = false;
        } else {
            this.anchors.push(this._screenToAnchor(x, y, vp));
        }
        this.isComplete = false;
    }

    onPointerMove(x, y, vp) {
        if (this.isComplete) return;
        if (this.anchors.length === 0) return; // need at least 1 fixed point
        if (this._hasPreview) {
            // Update the preview anchor to follow the cursor.
            this.anchors[this.anchors.length - 1] = this._screenToAnchor(x, y, vp);
        } else {
            // Add a preview anchor that follows the cursor.
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this._hasPreview = true;
        }
    }

    onPointerUp(x, y, vp) {
        // Pointer up does NOT finish the polyline — the user must double-click
        // or press Enter. We just leave the preview in place; the next
        // onPointerDown will convert it to a fixed point.
    }

    /**
     * Finish the polyline: drop the preview anchor and mark complete.
     * Called by DrawingManager on double-click or Enter.
     */
    finish() {
        if (this._hasPreview && this.anchors.length > 1) {
            this.anchors.pop();
            this._hasPreview = false;
        }
        if (this.anchors.length >= 2) {
            this.isComplete = true;
        }
    }

    /**
     * Cancel: clear all anchors (used when Esc is pressed mid-draw).
     */
    cancel() {
        this.anchors = [];
        this._hasPreview = false;
        this.isComplete = false;
    }

    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 2) {
            // Draw a single point as a small dot if we have exactly 1 anchor.
            if (this.visible && this.anchors.length === 1) {
                const p = this._anchorToScreen(this.anchors[0], vp);
                ctx.save();
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._applyLineStyle(ctx);
        ctx.beginPath();
        const p0 = this._anchorToScreen(this.anchors[0], vp);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < this.anchors.length; i++) {
            const p = this._anchorToScreen(this.anchors[i], vp);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // Preview indicator: a small hollow circle at the last point if it's
        // a live preview (not yet fixed).
        if (this._hasPreview && !this.isComplete) {
            const last = this.anchors[this.anchors.length - 1];
            const lp = this._anchorToScreen(last, vp);
            ctx.fillStyle = this._withAlpha(this.color, 0.3);
            ctx.beginPath();
            ctx.arc(lp.x, lp.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.isSelected || this.isHovered) {
            for (const a of this.anchors) {
                const p = this._anchorToScreen(a, vp);
                this._drawHandle(ctx, p.x, p.y, theme);
            }
        }
        ctx.restore();
    }

    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        // Don't count the preview anchor in hit-testing.
        const n = this._hasPreview ? this.anchors.length - 1 : this.anchors.length;
        for (let i = 1; i < n; i++) {
            const p1 = this._anchorToScreen(this.anchors[i - 1], vp);
            const p2 = this._anchorToScreen(this.anchors[i], vp);
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len2 = dx * dx + dy * dy;
            if (len2 === 0) continue;
            let t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            const cx = p1.x + t * dx, cy = p1.y + t * dy;
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= this._hitTolerance * this._hitTolerance) return true;
        }
        return false;
    }

    toJSON() {
        const json = super.toJSON();
        // Strip preview anchor before serializing.
        if (this._hasPreview && json.anchors.length > 0) {
            json.anchors = json.anchors.slice(0, -1);
        }
        return json;
    }
}

