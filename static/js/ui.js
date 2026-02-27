/**
 * UI helpers, DOM references, rendering, and utility functions.
 *
 * Key improvements over the monolithic version:
 *   – renderBars / updateBar use CSS transform: scaleY() instead of height
 *     → GPU-composited, no reflow
 *   – sleep() integrates with AbortController → no manual stopFlag polling
 *   – Timer uses requestAnimationFrame → synced to monitor refresh rate
 */

import { S, isAborted } from './state.js';
import { soundSorted } from './audio.js';

// ===== DOM References =====
export const DOM = {
    barsContainer:   document.getElementById('bars-container'),
    algoSelect:      document.getElementById('algorithm-select'),
    sizeSlider:      document.getElementById('size-slider'),
    sizeValue:       document.getElementById('size-value'),
    speedSlider:     document.getElementById('speed-slider'),
    speedValue:      document.getElementById('speed-value'),
    btnGenerate:     document.getElementById('btn-generate'),
    btnStart:        document.getElementById('btn-start'),
    btnStop:         document.getElementById('btn-stop'),
    statComparisons: document.getElementById('stat-comparisons'),
    statSwaps:       document.getElementById('stat-swaps'),
    statAccesses:    document.getElementById('stat-accesses'),
    statTime:        document.getElementById('stat-time'),
    algoName:        document.getElementById('algo-name'),
    algoTimeAvg:     document.getElementById('algo-time-avg'),
    algoTimeWorst:   document.getElementById('algo-time-worst'),
    algoSpace:       document.getElementById('algo-space'),
    algoDescription: document.getElementById('algo-description'),
    btnMute:         document.getElementById('btn-mute'),
    iconUnmuted:     document.getElementById('icon-unmuted'),
    iconMuted:       document.getElementById('icon-muted'),
    volumeSlider:    document.getElementById('volume-slider'),
};

// ===== Timer (requestAnimationFrame) =====
let rafId = null;

export function startTimer() {
    S.startTs = performance.now();
    function tick() {
        const elapsed = ((performance.now() - S.startTs) / 1000).toFixed(2);
        DOM.statTime.textContent = `${elapsed}s`;
        rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
}

export function stopTimer() {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    const elapsed = ((performance.now() - S.startTs) / 1000).toFixed(2);
    DOM.statTime.textContent = `${elapsed}s`;
}

// ===== Helpers =====

/** Delay in ms mapped from speed slider (1 = slow, 100 = fast). */
export function getDelay() {
    const speed = parseInt(DOM.speedSlider.value, 10);
    return Math.max(1, Math.round(500 / (speed * 0.5)));
}

/** Generate a shuffled array of values 1..n (Fisher-Yates). */
export function generateArray(n) {
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Render bars from the current S.array.
 *
 * DOM structure (new):
 *   div.bar-col          – flex item, full height, holds bar + optional label
 *       div.bar          – GPU-accelerated via transform: scaleY()
 *       span.bar-value   – label, positioned via absolute bottom (outside transform)
 */
export function renderBars() {
    DOM.barsContainer.innerHTML = '';
    S.barElements = [];
    const n = S.array.length;
    const maxVal = Math.max(...S.array);
    const showLabels = n <= 30;

    S.array.forEach((val) => {
        const col = document.createElement('div');
        col.className = 'bar-col';

        const bar = document.createElement('div');
        bar.className = 'bar';
        const scale = val / maxVal;
        bar.style.transform = `scaleY(${scale})`;
        col.appendChild(bar);

        if (showLabels) {
            const label = document.createElement('span');
            label.className = 'bar-value';
            label.textContent = val;
            label.style.bottom = `calc(${scale * 100}% + 4px)`;
            col.appendChild(label);
        }

        DOM.barsContainer.appendChild(col);
        S.barElements.push(bar);
    });
}

/**
 * Update a single bar's visual height + label.
 * GPU-accelerated: modifying transform does NOT trigger reflow.
 */
export function updateBar(index) {
    const maxVal = S.array.length; // values are 1..n
    const val = S.array[index];
    const scale = val / maxVal;
    const bar = S.barElements[index];
    bar.style.transform = `scaleY(${scale})`;
    const label = bar.parentElement?.querySelector('.bar-value');
    if (label) {
        label.textContent = val;
        label.style.bottom = `calc(${scale * 100}% + 4px)`;
    }
}

/** Clear all bar state classes. */
export function clearBarStates() {
    S.barElements.forEach(b =>
        b.classList.remove('comparing', 'swapping', 'pivot', 'sorted', 'active', 'sorted-anim'));
}

/**
 * Sleep that integrates with AbortController.
 * Rejects with AbortError when the user clicks Stop → the rejection
 * propagates up the entire async call-chain and is caught once in main.js.
 */
export function sleep(ms) {
    return new Promise((resolve, reject) => {
        const signal = S.abortCtrl?.signal;
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const id = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(id);
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });
}

/** Reset statistics counters. */
export function resetStats() {
    S.comparisons = 0;
    S.swaps = 0;
    S.accesses = 0;
    DOM.statComparisons.textContent = '0';
    DOM.statSwaps.textContent = '0';
    DOM.statAccesses.textContent = '0';
    DOM.statTime.textContent = '0.00s';
}

/** Push current stat values to the DOM. */
export function updateStats() {
    DOM.statComparisons.textContent = S.comparisons.toLocaleString();
    DOM.statSwaps.textContent       = S.swaps.toLocaleString();
    DOM.statAccesses.textContent    = S.accesses.toLocaleString();
}

/** Toggle UI controls during sort. */
export function setUISorting(isSorting) {
    S.sorting = isSorting;
    DOM.btnStart.disabled    = isSorting;
    DOM.btnStop.disabled     = !isSorting;
    DOM.btnGenerate.disabled = isSorting;
    DOM.sizeSlider.disabled  = isSorting;
    DOM.algoSelect.disabled  = isSorting;
}

/** Celebratory green sweep after sort completes. */
export async function celebrationSweep() {
    for (let i = 0; i < S.barElements.length; i++) {
        S.barElements[i].classList.remove('comparing', 'swapping', 'pivot', 'active');
        S.barElements[i].classList.add('sorted', 'sorted-anim');
        soundSorted(S.array[i]);
        await sleep(20);
    }
}

// ===== Helpers for Bitonic Sort padding =====

/** Add a dim sentinel bar (for padding to power-of-2). */
export function addPaddingBar() {
    const col = document.createElement('div');
    col.className = 'bar-col';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.transform = 'scaleY(0)';
    bar.style.opacity = '0.15';
    col.appendChild(bar);
    DOM.barsContainer.appendChild(col);
    S.barElements.push(bar);
}

/** Remove the last padding bar. */
export function removePaddingBar() {
    const bar = S.barElements.pop();
    bar.parentElement.remove();
}
