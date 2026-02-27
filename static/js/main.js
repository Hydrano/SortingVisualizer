/**
 * Entry point – event handlers and initialization.
 *
 * This is the only file referenced by the HTML <script type="module"> tag.
 * All other modules are pulled in via static imports.
 */

import { S }            from './state.js';
import { algorithms }   from './algorithms.js';
import {
    DOM, renderBars, generateArray, clearBarStates,
    resetStats, updateStats, setUISorting,
    startTimer, stopTimer, celebrationSweep, getDelay,
} from './ui.js';
import {
    ensureAudioCtx, applyVolume, setMuted, getMuted,
} from './audio.js';

// Maximum array size for Bogo Sort (O(n!) runtime)
const BOGO_MAX_SIZE = 8;

// ===== Helper =====

function initArray() {
    const size = parseInt(DOM.sizeSlider.value, 10);
    S.array = generateArray(size);
    renderBars();
    resetStats();
}

function updateAlgoInfo() {
    const opt = DOM.algoSelect.selectedOptions[0];
    DOM.algoName.textContent        = opt.textContent.trim();
    DOM.algoTimeAvg.textContent     = opt.dataset.timeAvg;
    DOM.algoTimeWorst.textContent   = opt.dataset.timeWorst;
    DOM.algoSpace.textContent       = opt.dataset.space;
    DOM.algoDescription.textContent = opt.dataset.description;
}

// ===== UI Events =====

DOM.sizeSlider.addEventListener('input', () => {
    DOM.sizeValue.textContent = DOM.sizeSlider.value;
    if (!S.sorting) initArray();
});

DOM.speedSlider.addEventListener('input', () => {
    DOM.speedValue.textContent = DOM.speedSlider.value;
});

DOM.algoSelect.addEventListener('change', updateAlgoInfo);

DOM.btnGenerate.addEventListener('click', () => {
    if (!S.sorting) initArray();
});

// ---------- Stop ----------
DOM.btnStop.addEventListener('click', () => {
    S.abortCtrl?.abort();
});

// ---------- Audio ----------
DOM.btnMute.addEventListener('click', () => {
    const muted = !getMuted();
    setMuted(muted);
    DOM.iconUnmuted.style.display = muted ? 'none' : '';
    DOM.iconMuted.style.display   = muted ? '' : 'none';
    DOM.btnMute.classList.toggle('muted', muted);
});

DOM.volumeSlider.addEventListener('input', () => {
    applyVolume(parseInt(DOM.volumeSlider.value, 10));
    if (getMuted() && parseInt(DOM.volumeSlider.value, 10) > 0) {
        setMuted(false);
        DOM.iconUnmuted.style.display = '';
        DOM.iconMuted.style.display   = 'none';
        DOM.btnMute.classList.remove('muted');
    }
});

// ---------- Start ----------
DOM.btnStart.addEventListener('click', async () => {
    const algoId = DOM.algoSelect.value;
    const sortFn = algorithms[algoId];
    if (!sortFn) return;

    // Bogo Sort: auto-reduce to safe size
    if (algoId === 'bogo' && S.array.length > BOGO_MAX_SIZE) {
        S.array = generateArray(BOGO_MAX_SIZE);
        renderBars();
        DOM.sizeSlider.value = String(BOGO_MAX_SIZE);
        DOM.sizeValue.textContent = String(BOGO_MAX_SIZE);
    }

    ensureAudioCtx();
    S.abortCtrl = new AbortController();
    clearBarStates();
    resetStats();
    setUISorting(true);
    startTimer();

    try {
        await sortFn();
        await celebrationSweep();
    } catch (e) {
        if (e.name !== 'AbortError') throw e;
        // User pressed Stop — clean exit
    } finally {
        stopTimer();
        clearBarStates();
        setUISorting(false);
        S.abortCtrl = null;
    }
});

// ===== Initialise =====
updateAlgoInfo();
initArray();
