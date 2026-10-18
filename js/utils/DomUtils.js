/**
 * DomUtils.js
 * DOM manipulation helpers.
 */
export const DomUtils = {
    /**
     * Create an element with attributes and children.
     */
    el(tag, attrs = {}, children = []) {
        const node = document.createElement(tag);
        for (const key in attrs) {
            if (key === 'class') node.className = attrs[key];
            else if (key === 'style') node.style.cssText = attrs[key];
            else if (key === 'text') node.textContent = attrs[key];
            else if (key.startsWith('on') && typeof attrs[key] === 'function') {
                node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
            } else if (key === 'dataset') {
                for (const dk in attrs[key]) node.dataset[dk] = attrs[key][dk];
            } else {
                node.setAttribute(key, attrs[key]);
            }
        }
        for (const child of [].concat(children)) {
            if (child == null) continue;
            node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        }
        return node;
    },

    /**
     * Clear all children of an element.
     */
    clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
        return node;
    },

    /**
     * Request fullscreen on an element.
     */
    requestFullscreen(el) {
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        if (el.msRequestFullscreen) return el.msRequestFullscreen();
    },

    /**
     * Exit fullscreen.
     */
    exitFullscreen() {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
        if (document.msExitFullscreen) return document.msExitFullscreen();
    },

    isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }
};
