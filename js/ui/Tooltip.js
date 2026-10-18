/**
 * Tooltip.js
 * Floating OHLCV tooltip that shows the data of the bar under the cursor.
 * Rendered as HTML for crisp text and easy styling, positioned over the canvas.
 */
import { DomUtils } from '../utils/DomUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Tooltip {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.element = DomUtils.el('div', { class: 'ac-tooltip' });
        container.appendChild(this.element);
        this._lastIdx = -2;
    }

    /**
     * Update the tooltip content & position. If idx is the same as last time,
     * only the position is updated (cheap).
     */
    update(idx, dm, viewport, pointerInside) {
        if (!pointerInside || idx < 0 || idx >= dm.size) {
            this.element.style.display = 'none';
            this._lastIdx = -2;
            return;
        }
        if (idx !== this._lastIdx) {
            const c = dm.get(idx);
            if (!c) { this.element.style.display = 'none'; return; }
            const change = c.close - c.open;
            const changePct = (change / c.open) * 100;
            const dirColor = change >= 0 ? 'var(--ac-up)' : 'var(--ac-down)';
            const d = new Date(c.time);
            const timeStr = d.toLocaleString('en-US', {
                month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            });
            this.element.innerHTML = `
                <div class="ac-tooltip-header">${timeStr}</div>
                <div class="ac-tooltip-row"><span>O</span><b>${MathUtils.formatPrice(c.open)}</b></div>
                <div class="ac-tooltip-row"><span>H</span><b style="color:${dirColor}">${MathUtils.formatPrice(c.high)}</b></div>
                <div class="ac-tooltip-row"><span>L</span><b style="color:${dirColor}">${MathUtils.formatPrice(c.low)}</b></div>
                <div class="ac-tooltip-row"><span>C</span><b style="color:${dirColor}">${MathUtils.formatPrice(c.close)}</b></div>
                <div class="ac-tooltip-row"><span>Chg</span><b style="color:${dirColor}">${change >= 0 ? '+' : ''}${change.toFixed(4)} (${changePct.toFixed(2)}%)</b></div>
                <div class="ac-tooltip-row"><span>Vol</span><b>${this._fmtVol(c.volume)}</b></div>
            `;
            this._lastIdx = idx;
        }
        this.element.style.display = 'block';
        // Position near top-left but avoid going off-screen
        const x = viewport.indexToX(idx) + viewport.barSpacing + 10;
        const y = 10;
        const w = this.element.offsetWidth;
        const finalX = (x + w > viewport.width - 70) ? Math.max(8, viewport.width - 70 - w - 10) : x;
        this.element.style.left = finalX + 'px';
        this.element.style.top = y + 'px';
    }

    _fmtVol(v) {
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(0);
    }

    destroy() { this.element.remove(); }
}
