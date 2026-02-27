/**
 * Audio engine for Sorting Visualizer.
 * Uses a fixed oscillator pool + throttling to avoid GC pressure and audio-thread overload.
 */

import { S } from './state.js';

// ===== Internal State =====
let audioCtx   = null;
let gainNode   = null;
let isMuted    = false;

// Oscillator pool (reusable, round-robin)
const POOL_SIZE = 4;
let oscPool  = [];
let oscIdx   = 0;

// Throttle: max ~20 tones per second
let lastToneTs = 0;
const MIN_TONE_GAP = 1000 / 20; // 50 ms

// ===== Public API =====

/** Lazily create AudioContext (browsers require a user gesture first). */
export function ensureAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        applyVolume();
        _initPool();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

/** Map a bar value (1..n) to a frequency (200 Hz – 1 200 Hz). */
function valueToFreq(value) {
    const n = S.array.length || 1;
    return 200 + ((value - 1) / Math.max(n - 1, 1)) * 1000;
}

/**
 * Play a short sine tone (throttled, pooled).
 * Instead of creating a new oscillator every time, we re-use one from the
 * pool and simply move its frequency.
 */
function playTone(freq, duration = 0.05) {
    if (isMuted || !audioCtx || oscPool.length === 0) return;

    const now = performance.now();
    if (now - lastToneTs < MIN_TONE_GAP) return;   // throttle
    lastToneTs = now;

    const { osc, env } = oscPool[oscIdx];
    oscIdx = (oscIdx + 1) % POOL_SIZE;

    const t = audioCtx.currentTime;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.cancelScheduledValues(t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.005);
    env.gain.linearRampToValueAtTime(0, t + duration);
}

/** Sound for a comparison (both operands). */
export function soundCompare(i, j) {
    if (isMuted) return;
    ensureAudioCtx();
    playTone(valueToFreq(S.array[i]), 0.05);
    setTimeout(() => playTone(valueToFreq(S.array[j]), 0.05), 15);
}

/** Sound for a swap / write at index i. */
export function soundSwap(i) {
    if (isMuted) return;
    ensureAudioCtx();
    playTone(valueToFreq(S.array[i]), 0.07);
}

/** Rising tone for the celebration sweep. */
export function soundSorted(value) {
    if (isMuted) return;
    ensureAudioCtx();
    playTone(valueToFreq(value), 0.06);
}

/** Apply volume (0-100 scale). */
export function applyVolume(vol) {
    if (!gainNode || !audioCtx) return;
    const v = (typeof vol === 'number' ? vol : 30) / 100;
    gainNode.gain.setValueAtTime(v * 0.5, audioCtx.currentTime);
}

export function setMuted(m) { isMuted = m; }
export function getMuted()  { return isMuted; }

// ===== Internal helpers =====

function _initPool() {
    oscPool.forEach(o => { try { o.osc.disconnect(); o.osc.stop(); } catch (_) { /* noop */ } });
    oscPool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        const env = audioCtx.createGain();
        env.gain.setValueAtTime(0, audioCtx.currentTime);
        osc.connect(env);
        env.connect(gainNode);
        osc.start();
        oscPool.push({ osc, env });
    }
}
