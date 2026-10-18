/**
 * ColorPicker.js
 * HSL color picker card — modeled on the user-provided screenshot.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐
 *   │ اختيار اللون   [hex input]   [color swatch] │  ← header
 *   ├──────┬───────────────────────────────────────┤
 *   │ Hue  │                                       │
 *   │ Bar  │   Saturation/Lightness gradient       │  ← body
 *   │ ▼    │                                       │
 *   ├──────┴───────────────────────────────────────┤
 *   │       [Reset]   [Done]                       │  ← footer
 *   └──────────────────────────────────────────────┘
 *
 * - Drag the white thumb on the hue bar to pick a hue.
 * - Click/drag on the SL square to pick saturation (X) and lightness (Y).
 * - Type a hex code in the input to jump to a specific color.
 * - The footer has "Reset" (back to original) and "Done" (apply + close).
 */
import { DomUtils } from '../utils/DomUtils.js';

export class ColorPicker {
    constructor(container, onChange) {
        this.container = container;
        this.onChange = onChange || (() => {});
        this._hue = 180;       // 0..360
        this._sat = 1;         // 0..1
        this._light = 0.5;     // 0..1
        this._originalHex = null;
        this._dragging = null; // 'hue' | 'sl' | null

        this.element = DomUtils.el('div', { class: 'ac-color-picker', style: 'display:none' });
        container.appendChild(this.element);
        this._build();
        this._update();
    }

    _build() {
        this.element.innerHTML = `
            <div class="ac-cp-header">
                <span class="ac-cp-title">اختيار اللون</span>
                <input type="text" class="ac-cp-hex" maxlength="7" value="#12C4F0">
                <button class="ac-cp-swatch" title="Current color"></button>
            </div>
            <div class="ac-cp-body">
                <div class="ac-cp-hue" tabindex="0">
                    <div class="ac-cp-hue-track"></div>
                    <div class="ac-cp-hue-thumb"></div>
                </div>
                <div class="ac-cp-sl" tabindex="0">
                    <div class="ac-cp-sl-cursor"></div>
                </div>
            </div>
            <div class="ac-cp-footer">
                <button class="ac-cp-btn ac-cp-reset">Reset</button>
                <button class="ac-cp-btn ac-cp-done">Done</button>
            </div>
        `;
        this._hexInput = this.element.querySelector('.ac-cp-hex');
        this._swatchBtn = this.element.querySelector('.ac-cp-swatch');
        this._hueEl     = this.element.querySelector('.ac-cp-hue');
        this._hueThumb  = this.element.querySelector('.ac-cp-hue-thumb');
        this._slEl      = this.element.querySelector('.ac-cp-sl');
        this._slCursor  = this.element.querySelector('.ac-cp-sl-cursor');

        // Hue drag
        this._hueEl.addEventListener('pointerdown', (e) => this._startDrag('hue', e));
        // SL drag
        this._slEl.addEventListener('pointerdown', (e) => this._startDrag('sl', e));
        // Hex input
        this._hexInput.addEventListener('change', () => this._onHexInput());
        // Footer buttons
        this.element.querySelector('.ac-cp-reset').addEventListener('click', () => this._reset());
        this.element.querySelector('.ac-cp-done').addEventListener('click', () => this.hide());
    }

    _startDrag(which, e) {
        e.preventDefault();
        this._dragging = which;
        this._move(which, e);
        const move = (ev) => this._move(which, ev);
        const up = () => {
            this._dragging = null;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }

    _move(which, e) {
        if (which === 'hue') {
            const r = this._hueEl.getBoundingClientRect();
            let t = (e.clientY - r.top) / r.height;
            t = Math.max(0, Math.min(1, t));
            this._hue = t * 360;
        } else {
            const r = this._slEl.getBoundingClientRect();
            let sx = (e.clientX - r.left) / r.width;
            let sy = (e.clientY - r.top) / r.height;
            sx = Math.max(0, Math.min(1, sx));
            sy = Math.max(0, Math.min(1, sy));
            // saturation = x; lightness = (1 - y) mapped to [0.05, 0.95]
            this._sat = sx;
            this._light = 1 - sy;
        }
        this._update();
    }

    _onHexInput() {
        const hex = this._hexInput.value.trim();
        const { h, s, l } = hexToHsl(hex);
        if (isFinite(h)) {
            this._hue = h;
            this._sat = s;
            this._light = l;
            this._update();
        }
    }

    _update() {
        const hex = hslToHex(this._hue, this._sat, this._light);
        // Header
        this._hexInput.value = hex;
        this._swatchBtn.style.background = hex;
        // Hue thumb position
        const huePct = (this._hue / 360) * 100;
        this._hueThumb.style.top = `calc(${huePct}% - 6px)`;
        // SL gradient background (depends on current hue)
        const hueColor = `hsl(${this._hue}, 100%, 50%)`;
        this._slEl.style.background = `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, ${hueColor})
        `;
        // SL cursor position
        const xPct = this._sat * 100;
        const yPct = (1 - this._light) * 100;
        this._slCursor.style.left = `calc(${xPct}% - 6px)`;
        this._slCursor.style.top = `calc(${yPct}% - 6px)`;
        this._slCursor.style.background = hex;
        // Notify change listener
        this.onChange(hex);
    }

    _reset() {
        if (this._originalHex) {
            const { h, s, l } = hexToHsl(this._originalHex);
            if (isFinite(h)) {
                this._hue = h; this._sat = s; this._light = l;
                this._update();
            }
        }
    }

    show(initialColor) {
        if (initialColor) {
            this._originalHex = initialColor;
            const { h, s, l } = hexToHsl(initialColor);
            if (isFinite(h)) {
                this._hue = h; this._sat = s; this._light = l;
            }
        }
        this.element.style.display = 'flex';
        this._update();
    }

    hide() {
        this.element.style.display = 'none';
    }

    setColor(hex) {
        const { h, s, l } = hexToHsl(hex);
        if (isFinite(h)) {
            this._hue = h; this._sat = s; this._light = l;
            this._update();
        }
    }

    getColor() {
        return hslToHex(this._hue, this._sat, this._light);
    }
}

// ---- Color conversion helpers ----

function hexToHsl(hex) {
    if (!hex) return { h: 0, s: 0, l: 0.5 };
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return { h: 0, s: 0, l: 0.5 };
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hue = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: hue = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
            case g: hue = ((b - r) / d + 2) * 60; break;
            case b: hue = ((r - g) / d + 4) * 60; break;
        }
    }
    return { h: hue, s, l };
}

function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)      { r = c; g = x; b = 0; }
    else if (h < 120){ r = x; g = c; b = 0; }
    else if (h < 180){ r = 0; g = c; b = x; }
    else if (h < 240){ r = 0; g = x; b = c; }
    else if (h < 300){ r = x; g = 0; b = c; }
    else             { r = c; g = 0; b = x; }
    const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
}
