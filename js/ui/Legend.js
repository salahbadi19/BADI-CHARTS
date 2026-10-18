/**
 * Legend.js
 * Top-left overlay showing the symbol name, current price, and change.
 * Updated on every render based on the last candle.
 */
import { DomUtils } from '../utils/DomUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Legend {
    constructor(container) {
        this.element = DomUtils.el('div', { class: 'ac-legend' });
        container.appendChild(this.element);
        this._lastClose = null;
    }

    update(symbol, dm, theme) {
        if (dm.size === 0) return;
        const last = dm.get(dm.size - 1);
        const prev = dm.size > 1 ? dm.get(dm.size - 2) : last;
        const change = last.close - prev.close;
        const changePct = prev.close ? (change / prev.close) * 100 : 0;
        const dir = change >= 0 ? 'up' : 'down';
        const color = dir === 'up' ? 'var(--ac-up)' : 'var(--ac-down)';
        const arrow = dir === 'up' ? '▲' : '▼';
        this.element.innerHTML = `
            <div class="ac-legend-symbol">${symbol}</div>
            <div class="ac-legend-price" style="color:${color}">${MathUtils.formatPrice(last.close)}</div>
            <div class="ac-legend-change" style="color:${color}">${arrow} ${change >= 0 ? '+' : ''}${change.toFixed(4)} (${changePct.toFixed(2)}%)</div>
            <div class="ac-legend-ohlcv">
                <span>O <b>${MathUtils.formatPrice(last.open)}</b></span>
                <span>H <b>${MathUtils.formatPrice(last.high)}</b></span>
                <span>L <b>${MathUtils.formatPrice(last.low)}</b></span>
                <span>C <b>${MathUtils.formatPrice(last.close)}</b></span>
                <span>Vol <b>${this._fmtVol(last.volume)}</b></span>
            </div>
        `;
    }

    _fmtVol(v) {
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(0);
    }
}
