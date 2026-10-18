/**
 * StatusBar.js
 */
import { DomUtils } from '../utils/DomUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class StatusBar {
    constructor(container) {
        this.element = DomUtils.el('div', { class: 'ac-statusbar' });
        container.appendChild(this.element);
        this._left = DomUtils.el('div', { class: 'ac-statusbar-left' });
        this._right = DomUtils.el('div', { class: 'ac-statusbar-right' });
        this.element.append(this._left, this._right);
        this._state = { bars: 0, drawings: 0, indicators: 0, fps: 0, cursorPrice: '—', cursorIdx: '—' };
    }
    setCursor(price, idx) { this._state.cursorPrice = price != null ? MathUtils.formatPrice(price) : '—'; this._state.cursorIdx = idx != null ? '#' + idx : '—'; this._render(); }
    setDrawings(c) { this._state.drawings = c; this._render(); }
    setBars(c) { this._state.bars = c; this._render(); }
    setIndicators(c) { this._state.indicators = c; this._render(); }
    setFps(f) { this._state.fps = f; this._render(); }
    _render() {
        this._left.innerHTML = `
            <span>Bars: <b>${this._state.bars}</b></span>
            <span>Indicators: <b>${this._state.indicators}</b></span>
            <span>Drawings: <b>${this._state.drawings}</b></span>
            <span>Cursor: <b>${this._state.cursorPrice}</b> @ ${this._state.cursorIdx}</span>`;
        this._right.innerHTML = `<span>FPS: <b>${this._state.fps}</b></span><span>BadiCharts v1.0</span>`;
    }
}
