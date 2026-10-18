/**
 * Theme.js
 * Centralized theme definitions. Two built-in themes: Dark and Light.
 * Easily extensible - just add another entry to THEMES.
 */
export const THEMES = {
    dark: {
        name: 'dark',
        background: '#0e1117',
        chartBg: '#0e1117',
        gridLine: 'rgba(255, 255, 255, 0.04)',
        axisLine: 'rgba(255, 255, 255, 0.1)',
        textColor: '#cfd3dc',
        mutedText: '#6e7681',
        priceScaleBg: '#0a0d12',
        priceScaleBorder: 'rgba(255, 255, 255, 0.08)',
        priceScaleText: '#9ba1ab',
        timeScaleBg: '#0a0d12',
        timeScaleBorder: 'rgba(255, 255, 255, 0.08)',
        timeScaleText: '#9ba1ab',
        // BadiCharts candle palette — vivid mint green / coral red, distinct
        // from the muted TradingView teal/red. Tuned for high contrast on dark
        // backgrounds and a "fresh / energetic" feel that traders report loving.
        upColor: '#16C784',
        downColor: '#EA3943',
        upWick: 'rgba(22, 199, 132, 0.9)',
        downWick: 'rgba(234, 57, 67, 0.9)',
        candleBorder: 'rgba(0, 0, 0, 0.3)',
        volumeLabel: '#6e7681',
        paneDivider: 'rgba(255, 255, 255, 0.06)',
        crosshairColor: 'rgba(255, 255, 255, 0.4)',
        crosshairLabelBg: '#2a2e39',
        crosshairLabelText: '#fff',
        lastPriceTagText: '#fff',
        handleFill: '#1f2530',
        handleBorder: '#5b9bd5',
        toolbarBg: '#0a0d12',
        toolbarBorder: 'rgba(255, 255, 255, 0.06)',
        toolbarBtn: '#2a2e39',
        toolbarBtnActive: '#12C4F0',
        toolbarBtnText: '#cfd3dc',
        statusBarBg: '#0a0d12',
        statusBarText: '#9ba1ab'
    },
    light: {
        name: 'light',
        background: '#ffffff',
        chartBg: '#ffffff',
        gridLine: 'rgba(0, 0, 0, 0.05)',
        axisLine: 'rgba(0, 0, 0, 0.15)',
        textColor: '#1e222d',
        mutedText: '#787b86',
        priceScaleBg: '#f8f9fd',
        priceScaleBorder: 'rgba(0, 0, 0, 0.08)',
        priceScaleText: '#5d606b',
        timeScaleBg: '#f8f9fd',
        timeScaleBorder: 'rgba(0, 0, 0, 0.08)',
        timeScaleText: '#5d606b',
        // BadiCharts candle palette (same hues as dark theme).
        upColor: '#16C784',
        downColor: '#EA3943',
        upWick: 'rgba(22, 199, 132, 0.9)',
        downWick: 'rgba(234, 57, 67, 0.9)',
        candleBorder: 'rgba(0, 0, 0, 0.15)',
        volumeLabel: '#787b86',
        paneDivider: 'rgba(0, 0, 0, 0.08)',
        crosshairColor: 'rgba(0, 0, 0, 0.4)',
        crosshairLabelBg: '#1e222d',
        crosshairLabelText: '#fff',
        lastPriceTagText: '#fff',
        handleFill: '#ffffff',
        handleBorder: '#12C4F0',
        toolbarBg: '#f8f9fd',
        toolbarBorder: 'rgba(0, 0, 0, 0.08)',
        toolbarBtn: '#e9ecef',
        toolbarBtnActive: '#12C4F0',
        toolbarBtnText: '#1e222d',
        statusBarBg: '#f8f9fd',
        statusBarText: '#5d606b'
    }
};

export class ThemeManager {
    constructor(initial = 'dark') {
        this.current = THEMES[initial] || THEMES.dark;
        this.name = initial;
        this.subscribers = new Set();
    }

    get() { return this.current; }

    set(name) {
        if (!THEMES[name]) return;
        this.current = THEMES[name];
        this.name = name;
        this.subscribers.forEach(fn => fn(this.current));
    }

    toggle() {
        this.set(this.name === 'dark' ? 'light' : 'dark');
    }

    subscribe(fn) {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }
}
