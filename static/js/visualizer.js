/**
 * Sorting Algorithm Visualizer
 * Animates sorting algorithms step-by-step with colored bars.
 */

(() => {
    "use strict";

    // ===== DOM References =====
    const barsContainer   = document.getElementById("bars-container");
    const algoSelect      = document.getElementById("algorithm-select");
    const sizeSlider      = document.getElementById("size-slider");
    const sizeValue       = document.getElementById("size-value");
    const speedSlider     = document.getElementById("speed-slider");
    const speedValue      = document.getElementById("speed-value");
    const btnGenerate     = document.getElementById("btn-generate");
    const btnStart        = document.getElementById("btn-start");
    const btnStop         = document.getElementById("btn-stop");
    const statComparisons = document.getElementById("stat-comparisons");
    const statSwaps       = document.getElementById("stat-swaps");
    const statAccesses    = document.getElementById("stat-accesses");
    const statTime        = document.getElementById("stat-time");
    const algoName        = document.getElementById("algo-name");
    const algoTimeAvg     = document.getElementById("algo-time-avg");
    const algoTimeWorst   = document.getElementById("algo-time-worst");
    const algoSpace       = document.getElementById("algo-space");
    const algoDescription = document.getElementById("algo-description");

    // Audio controls
    const btnMute      = document.getElementById("btn-mute");
    const iconUnmuted  = document.getElementById("icon-unmuted");
    const iconMuted    = document.getElementById("icon-muted");
    const volumeSlider = document.getElementById("volume-slider");

    // ===== State =====
    let array       = [];
    let barElements = [];
    let sorting     = false;
    let stopFlag    = false;
    let comparisons = 0;
    let swaps       = 0;
    let accesses    = 0;
    let startTs     = 0;
    let timerInterval = null;

    // ===== Audio Engine (Web Audio API) =====
    let audioCtx   = null;
    let gainNode   = null;
    let isMuted    = false;

    /** Lazily create AudioContext (browsers require user gesture). */
    function ensureAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);
            applyVolume();
        }
        if (audioCtx.state === "suspended") audioCtx.resume();
    }

    /** Map a bar value (1..n) to a frequency (200 Hz .. 1200 Hz). */
    function valueToFreq(value) {
        const n = array.length || 1;
        const ratio = (value - 1) / Math.max(n - 1, 1); // 0..1
        return 200 + ratio * 1000; // 200 Hz – 1200 Hz
    }

    /** Play a very short sine tone at the given frequency. */
    function playTone(freq, duration = 0.05) {
        if (isMuted || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        // Soft envelope to avoid clicks
        const env = audioCtx.createGain();
        env.gain.setValueAtTime(0, audioCtx.currentTime);
        env.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.005);
        env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

        osc.connect(env);
        env.connect(gainNode);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration + 0.01);
    }

    /** Play a sound for a comparison (both values). */
    function soundCompare(i, j) {
        if (isMuted) return;
        ensureAudioCtx();
        playTone(valueToFreq(array[i]), 0.05);
        // Slight offset for the second tone so they layer nicely
        setTimeout(() => playTone(valueToFreq(array[j]), 0.05), 15);
    }

    /** Play a sound for a swap / write. */
    function soundSwap(i) {
        if (isMuted) return;
        ensureAudioCtx();
        playTone(valueToFreq(array[i]), 0.07);
    }

    /** Play a rising tone for the celebration sweep. */
    function soundSorted(value) {
        if (isMuted) return;
        ensureAudioCtx();
        playTone(valueToFreq(value), 0.06);
    }

    /** Apply volume from slider. */
    function applyVolume() {
        if (!gainNode) return;
        const vol = parseInt(volumeSlider.value, 10) / 100;
        gainNode.gain.setValueAtTime(vol * 0.5, audioCtx.currentTime); // cap at 0.5 to stay comfortable
    }

    // ===== Helpers =====

    /** Delay in ms mapped from speed slider (1 = slow, 100 = fast). */
    function getDelay() {
        const speed = parseInt(speedSlider.value, 10);
        // Map: speed 1 → 500ms, speed 100 → 1ms (logarithmic feel)
        return Math.max(1, Math.round(500 / (speed * 0.5)));
    }

    /** Generate a shuffled array of values 1..n. */
    function generateArray(n) {
        const arr = Array.from({ length: n }, (_, i) => i + 1);
        // Fisher-Yates shuffle
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /** Render bars in the DOM from the current array. */
    function renderBars() {
        barsContainer.innerHTML = "";
        barElements = [];
        const n = array.length;
        const maxVal = Math.max(...array);
        const showLabels = n <= 30;

        array.forEach((val) => {
            const bar = document.createElement("div");
            bar.className = "bar";
            bar.style.height = `${(val / maxVal) * 100}%`;

            if (showLabels) {
                const label = document.createElement("span");
                label.className = "bar-value";
                label.textContent = val;
                bar.appendChild(label);
            }

            barsContainer.appendChild(bar);
            barElements.push(bar);
        });
    }

    /** Update a single bar's height + label. */
    function updateBar(index) {
        const maxVal = array.length; // values are 1..n
        const bar = barElements[index];
        bar.style.height = `${(array[index] / maxVal) * 100}%`;
        const label = bar.querySelector(".bar-value");
        if (label) label.textContent = array[index];
    }

    /** Clear all bar state classes. */
    function clearBarStates() {
        barElements.forEach((b) => b.classList.remove("comparing", "swapping", "pivot", "sorted", "active", "sorted-anim"));
    }

    /** Sleep that respects the stop flag. */
    function sleep(ms) {
        return new Promise((resolve) => {
            if (stopFlag) return resolve();
            setTimeout(resolve, ms);
        });
    }

    /** Reset stats counters. */
    function resetStats() {
        comparisons = 0;
        swaps = 0;
        accesses = 0;
        statComparisons.textContent = "0";
        statSwaps.textContent = "0";
        statAccesses.textContent = "0";
        statTime.textContent = "0.00s";
    }

    function updateStats() {
        statComparisons.textContent = comparisons.toLocaleString();
        statSwaps.textContent = swaps.toLocaleString();
        statAccesses.textContent = accesses.toLocaleString();
    }

    function startTimer() {
        startTs = performance.now();
        timerInterval = setInterval(() => {
            const elapsed = ((performance.now() - startTs) / 1000).toFixed(2);
            statTime.textContent = `${elapsed}s`;
        }, 50);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
        const elapsed = ((performance.now() - startTs) / 1000).toFixed(2);
        statTime.textContent = `${elapsed}s`;
    }

    /** Toggle UI controls during sort. */
    function setUISorting(isSorting) {
        sorting = isSorting;
        btnStart.disabled = isSorting;
        btnStop.disabled = !isSorting;
        btnGenerate.disabled = isSorting;
        sizeSlider.disabled = isSorting;
        algoSelect.disabled = isSorting;
    }

    /** Celebratory sweep after sort completes. */
    async function celebrationSweep() {
        for (let i = 0; i < barElements.length; i++) {
            if (stopFlag) return;
            barElements[i].classList.remove("comparing", "swapping", "pivot", "active");
            barElements[i].classList.add("sorted", "sorted-anim");
            soundSorted(array[i]);
            await sleep(20);
        }
    }

    // ===== Sorting Algorithms =====
    // Each algorithm is an async generator that yields after visual steps.
    // This allows fine-grained animation with a consistent API.

    // ---------- Bubble Sort ----------
    async function bubbleSort() {
        const n = array.length;
        for (let i = 0; i < n - 1; i++) {
            for (let j = 0; j < n - i - 1; j++) {
                if (stopFlag) return;
                // Highlight comparing
                barElements[j].classList.add("comparing");
                barElements[j + 1].classList.add("comparing");
                accesses += 2;
                comparisons++;
                soundCompare(j, j + 1);
                updateStats();
                await sleep(getDelay());

                if (array[j] > array[j + 1]) {
                    // Swap
                    barElements[j].classList.remove("comparing");
                    barElements[j + 1].classList.remove("comparing");
                    barElements[j].classList.add("swapping");
                    barElements[j + 1].classList.add("swapping");
                    [array[j], array[j + 1]] = [array[j + 1], array[j]];
                    swaps++;
                    accesses += 4; // read + write x2
                    updateBar(j);
                    updateBar(j + 1);
                    soundSwap(j);
                    updateStats();
                    await sleep(getDelay());
                    barElements[j].classList.remove("swapping");
                    barElements[j + 1].classList.remove("swapping");
                } else {
                    barElements[j].classList.remove("comparing");
                    barElements[j + 1].classList.remove("comparing");
                }
            }
            barElements[n - i - 1].classList.add("sorted");
        }
        barElements[0].classList.add("sorted");
    }

    // ---------- Selection Sort ----------
    async function selectionSort() {
        const n = array.length;
        for (let i = 0; i < n - 1; i++) {
            if (stopFlag) return;
            let minIdx = i;
            barElements[i].classList.add("active");

            for (let j = i + 1; j < n; j++) {
                if (stopFlag) return;
                barElements[j].classList.add("comparing");
                accesses += 2;
                comparisons++;
                soundCompare(j, minIdx);
                updateStats();
                await sleep(getDelay());

                if (array[j] < array[minIdx]) {
                    if (minIdx !== i) barElements[minIdx].classList.remove("pivot");
                    minIdx = j;
                    barElements[minIdx].classList.add("pivot");
                }
                barElements[j].classList.remove("comparing");
            }

            if (minIdx !== i) {
                barElements[i].classList.add("swapping");
                barElements[minIdx].classList.add("swapping");
                [array[i], array[minIdx]] = [array[minIdx], array[i]];
                swaps++;
                accesses += 4;
                updateBar(i);
                updateBar(minIdx);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                barElements[i].classList.remove("swapping");
                barElements[minIdx].classList.remove("swapping");
                barElements[minIdx].classList.remove("pivot");
            }
            barElements[i].classList.remove("active");
            barElements[i].classList.add("sorted");
        }
        barElements[array.length - 1].classList.add("sorted");
    }

    // ---------- Insertion Sort ----------
    async function insertionSort() {
        const n = array.length;
        barElements[0].classList.add("sorted");

        for (let i = 1; i < n; i++) {
            if (stopFlag) return;
            let key = array[i];
            accesses++;
            let j = i - 1;
            barElements[i].classList.add("active");
            await sleep(getDelay());

            while (j >= 0 && array[j] > key) {
                if (stopFlag) return;
                barElements[j].classList.add("comparing");
                comparisons++;
                accesses += 2;
                soundSwap(j);
                await sleep(getDelay());

                array[j + 1] = array[j];
                accesses += 2;
                swaps++;
                updateBar(j + 1);
                soundSwap(j + 1);
                barElements[j].classList.remove("comparing");
                j--;
                updateStats();
            }
            if (j + 1 < n) comparisons++; // final comparison that exits loop

            array[j + 1] = key;
            accesses++;
            updateBar(j + 1);
            barElements[i].classList.remove("active");

            // Mark all 0..i as sorted
            for (let k = 0; k <= i; k++) {
                barElements[k].classList.add("sorted");
            }
            updateStats();
        }
    }

    // ---------- Quick Sort ----------
    async function quickSort(low = 0, high = array.length - 1) {
        if (low < high && !stopFlag) {
            const pi = await partition(low, high);
            if (stopFlag) return;
            await quickSort(low, pi - 1);
            await quickSort(pi + 1, high);
        }
        // Mark sorted once a partition is size 1
        if (low === high && low >= 0 && low < array.length) {
            barElements[low].classList.add("sorted");
        }
    }

    async function partition(low, high) {
        const pivotVal = array[high];
        accesses++;
        barElements[high].classList.add("pivot");
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (stopFlag) return -1;
            barElements[j].classList.add("comparing");
            accesses++;
            comparisons++;
            soundSwap(j);
            updateStats();
            await sleep(getDelay());

            if (array[j] < pivotVal) {
                i++;
                if (i !== j) {
                    barElements[i].classList.add("swapping");
                    barElements[j].classList.add("swapping");
                    [array[i], array[j]] = [array[j], array[i]];
                    swaps++;
                    accesses += 4;
                    updateBar(i);
                    updateBar(j);
                    soundSwap(i);
                    updateStats();
                    await sleep(getDelay());
                    barElements[i].classList.remove("swapping");
                }
                barElements[j].classList.remove("swapping");
            }
            barElements[j].classList.remove("comparing");
        }

        // Place pivot
        i++;
        if (i !== high) {
            barElements[i].classList.add("swapping");
            barElements[high].classList.add("swapping");
            [array[i], array[high]] = [array[high], array[i]];
            swaps++;
            accesses += 4;
            updateBar(i);
            updateBar(high);
            soundSwap(i);
            updateStats();
            await sleep(getDelay());
            barElements[high].classList.remove("swapping");
        }
        barElements[high].classList.remove("pivot");
        barElements[i].classList.remove("swapping");
        barElements[i].classList.add("sorted");

        return i;
    }

    // ---------- Merge Sort ----------
    async function mergeSort(left = 0, right = array.length - 1) {
        if (left >= right || stopFlag) return;
        const mid = Math.floor((left + right) / 2);
        await mergeSort(left, mid);
        await mergeSort(mid + 1, right);
        await merge(left, mid, right);
    }

    async function merge(left, mid, right) {
        const leftArr = array.slice(left, mid + 1);
        const rightArr = array.slice(mid + 1, right + 1);
        accesses += right - left + 1;
        let i = 0, j = 0, k = left;

        // Highlight the region being merged
        for (let x = left; x <= right; x++) {
            barElements[x].classList.add("active");
        }
        await sleep(getDelay());

        while (i < leftArr.length && j < rightArr.length && !stopFlag) {
            comparisons++;
            accesses += 2;

            barElements[k].classList.add("comparing");
            soundSwap(k);
            await sleep(getDelay());

            if (leftArr[i] <= rightArr[j]) {
                array[k] = leftArr[i];
                i++;
            } else {
                array[k] = rightArr[j];
                j++;
                swaps++; // count as an inversion fix
            }
            accesses++;
            updateBar(k);
            soundSwap(k);
            barElements[k].classList.remove("comparing", "active");
            barElements[k].classList.add("sorted");
            updateStats();
            k++;
        }

        while (i < leftArr.length && !stopFlag) {
            array[k] = leftArr[i];
            accesses++;
            updateBar(k);
            soundSwap(k);
            barElements[k].classList.remove("active");
            barElements[k].classList.add("sorted");
            i++;
            k++;
            await sleep(getDelay());
        }

        while (j < rightArr.length && !stopFlag) {
            array[k] = rightArr[j];
            accesses++;
            updateBar(k);
            soundSwap(k);
            barElements[k].classList.remove("active");
            barElements[k].classList.add("sorted");
            j++;
            k++;
            await sleep(getDelay());
        }

        // Clean up remaining active highlights
        for (let x = left; x <= right; x++) {
            barElements[x].classList.remove("active");
        }
    }

    // ---------- Heap Sort ----------
    async function heapSort() {
        const n = array.length;

        // Build max heap
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            if (stopFlag) return;
            await heapify(n, i);
        }

        // Extract elements
        for (let i = n - 1; i > 0; i--) {
            if (stopFlag) return;
            barElements[0].classList.add("swapping");
            barElements[i].classList.add("swapping");
            [array[0], array[i]] = [array[i], array[0]];
            swaps++;
            accesses += 4;
            updateBar(0);
            updateBar(i);
            soundSwap(0);
            updateStats();
            await sleep(getDelay());
            barElements[0].classList.remove("swapping");
            barElements[i].classList.remove("swapping");
            barElements[i].classList.add("sorted");

            await heapify(i, 0);
        }
        barElements[0].classList.add("sorted");
    }

    async function heapify(n, i) {
        let largest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;

        barElements[i].classList.add("active");

        if (left < n) {
            accesses += 2;
            comparisons++;
            barElements[left].classList.add("comparing");
            soundSwap(left);
            await sleep(getDelay());
            if (array[left] > array[largest]) largest = left;
            barElements[left].classList.remove("comparing");
        }

        if (right < n) {
            accesses += 2;
            comparisons++;
            barElements[right].classList.add("comparing");
            soundSwap(right);
            await sleep(getDelay());
            if (array[right] > array[largest]) largest = right;
            barElements[right].classList.remove("comparing");
        }

        updateStats();
        barElements[i].classList.remove("active");

        if (largest !== i && !stopFlag) {
            barElements[i].classList.add("swapping");
            barElements[largest].classList.add("swapping");
            [array[i], array[largest]] = [array[largest], array[i]];
            swaps++;
            accesses += 4;
            updateBar(i);
            updateBar(largest);
            soundSwap(i);
            updateStats();
            await sleep(getDelay());
            barElements[i].classList.remove("swapping");
            barElements[largest].classList.remove("swapping");

            await heapify(n, largest);
        }
    }

    // ---------- Shell Sort ----------
    async function shellSort() {
        const n = array.length;
        for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
            for (let i = gap; i < n; i++) {
                if (stopFlag) return;
                const temp = array[i];
                accesses++;
                barElements[i].classList.add("active");
                let j = i;

                while (j >= gap) {
                    if (stopFlag) return;
                    barElements[j - gap].classList.add("comparing");
                    comparisons++;
                    accesses += 2;
                    soundSwap(j - gap);
                    updateStats();
                    await sleep(getDelay());

                    if (array[j - gap] > temp) {
                        array[j] = array[j - gap];
                        accesses += 2;
                        swaps++;
                        updateBar(j);
                        soundSwap(j);
                        barElements[j - gap].classList.remove("comparing");
                        j -= gap;
                    } else {
                        barElements[j - gap].classList.remove("comparing");
                        break;
                    }
                }

                array[j] = temp;
                accesses++;
                updateBar(j);
                barElements[i].classList.remove("active");
                updateStats();
            }
        }
    }

    // ---------- Cocktail Shaker Sort ----------
    async function cocktailSort() {
        const n = array.length;
        let start = 0;
        let end = n - 1;
        let swapped = true;

        while (swapped && !stopFlag) {
            swapped = false;

            // Forward pass
            for (let i = start; i < end; i++) {
                if (stopFlag) return;
                barElements[i].classList.add("comparing");
                barElements[i + 1].classList.add("comparing");
                comparisons++;
                accesses += 2;
                soundCompare(i, i + 1);
                updateStats();
                await sleep(getDelay());

                if (array[i] > array[i + 1]) {
                    barElements[i].classList.remove("comparing");
                    barElements[i + 1].classList.remove("comparing");
                    barElements[i].classList.add("swapping");
                    barElements[i + 1].classList.add("swapping");
                    [array[i], array[i + 1]] = [array[i + 1], array[i]];
                    swaps++;
                    accesses += 4;
                    updateBar(i);
                    updateBar(i + 1);
                    soundSwap(i);
                    updateStats();
                    await sleep(getDelay());
                    barElements[i].classList.remove("swapping");
                    barElements[i + 1].classList.remove("swapping");
                    swapped = true;
                } else {
                    barElements[i].classList.remove("comparing");
                    barElements[i + 1].classList.remove("comparing");
                }
            }
            barElements[end].classList.add("sorted");
            end--;

            if (!swapped) break;
            swapped = false;

            // Backward pass
            for (let i = end; i > start; i--) {
                if (stopFlag) return;
                barElements[i].classList.add("comparing");
                barElements[i - 1].classList.add("comparing");
                comparisons++;
                accesses += 2;
                soundCompare(i, i - 1);
                updateStats();
                await sleep(getDelay());

                if (array[i] < array[i - 1]) {
                    barElements[i].classList.remove("comparing");
                    barElements[i - 1].classList.remove("comparing");
                    barElements[i].classList.add("swapping");
                    barElements[i - 1].classList.add("swapping");
                    [array[i], array[i - 1]] = [array[i - 1], array[i]];
                    swaps++;
                    accesses += 4;
                    updateBar(i);
                    updateBar(i - 1);
                    soundSwap(i);
                    updateStats();
                    await sleep(getDelay());
                    barElements[i].classList.remove("swapping");
                    barElements[i - 1].classList.remove("swapping");
                    swapped = true;
                } else {
                    barElements[i].classList.remove("comparing");
                    barElements[i - 1].classList.remove("comparing");
                }
            }
            barElements[start].classList.add("sorted");
            start++;
        }

        // Mark remaining as sorted
        for (let i = start; i <= end; i++) {
            barElements[i].classList.add("sorted");
        }
    }

    // ---------- Comb Sort ----------
    async function combSort() {
        const n = array.length;
        let gap = n;
        const shrink = 1.3;
        let sorted = false;

        while (!sorted && !stopFlag) {
            gap = Math.floor(gap / shrink);
            if (gap <= 1) {
                gap = 1;
                sorted = true;
            }

            for (let i = 0; i + gap < n; i++) {
                if (stopFlag) return;
                barElements[i].classList.add("comparing");
                barElements[i + gap].classList.add("comparing");
                comparisons++;
                accesses += 2;
                soundCompare(i, i + gap);
                updateStats();
                await sleep(getDelay());

                if (array[i] > array[i + gap]) {
                    barElements[i].classList.remove("comparing");
                    barElements[i + gap].classList.remove("comparing");
                    barElements[i].classList.add("swapping");
                    barElements[i + gap].classList.add("swapping");
                    [array[i], array[i + gap]] = [array[i + gap], array[i]];
                    swaps++;
                    accesses += 4;
                    updateBar(i);
                    updateBar(i + gap);
                    soundSwap(i);
                    updateStats();
                    await sleep(getDelay());
                    barElements[i].classList.remove("swapping");
                    barElements[i + gap].classList.remove("swapping");
                    sorted = false;
                } else {
                    barElements[i].classList.remove("comparing");
                    barElements[i + gap].classList.remove("comparing");
                }
            }
        }
    }

    // ---------- Gnome Sort ----------
    async function gnomeSort() {
        const n = array.length;
        let pos = 0;

        while (pos < n && !stopFlag) {
            if (pos === 0) {
                pos++;
                continue;
            }

            barElements[pos].classList.add("comparing");
            barElements[pos - 1].classList.add("comparing");
            comparisons++;
            accesses += 2;
            soundCompare(pos, pos - 1);
            updateStats();
            await sleep(getDelay());

            if (array[pos] >= array[pos - 1]) {
                barElements[pos].classList.remove("comparing");
                barElements[pos - 1].classList.remove("comparing");
                pos++;
            } else {
                barElements[pos].classList.remove("comparing");
                barElements[pos - 1].classList.remove("comparing");
                barElements[pos].classList.add("swapping");
                barElements[pos - 1].classList.add("swapping");
                [array[pos], array[pos - 1]] = [array[pos - 1], array[pos]];
                swaps++;
                accesses += 4;
                updateBar(pos);
                updateBar(pos - 1);
                soundSwap(pos);
                updateStats();
                await sleep(getDelay());
                barElements[pos].classList.remove("swapping");
                barElements[pos - 1].classList.remove("swapping");
                pos--;
            }
        }
    }

    // ---------- Odd-Even Sort ----------
    async function oddEvenSort() {
        const n = array.length;
        let sorted = false;

        while (!sorted && !stopFlag) {
            sorted = true;

            // Odd-indexed pairs (1,2), (3,4), ...
            for (let i = 1; i < n - 1; i += 2) {
                if (stopFlag) return;
                barElements[i].classList.add("comparing");
                barElements[i + 1].classList.add("comparing");
                comparisons++;
                accesses += 2;
                soundCompare(i, i + 1);
                updateStats();
                await sleep(getDelay());

                if (array[i] > array[i + 1]) {
                    barElements[i].classList.remove("comparing");
                    barElements[i + 1].classList.remove("comparing");
                    barElements[i].classList.add("swapping");
                    barElements[i + 1].classList.add("swapping");
                    [array[i], array[i + 1]] = [array[i + 1], array[i]];
                    swaps++;
                    accesses += 4;
                    updateBar(i);
                    updateBar(i + 1);
                    soundSwap(i);
                    updateStats();
                    await sleep(getDelay());
                    barElements[i].classList.remove("swapping");
                    barElements[i + 1].classList.remove("swapping");
                    sorted = false;
                } else {
                    barElements[i].classList.remove("comparing");
                    barElements[i + 1].classList.remove("comparing");
                }
            }

            // Even-indexed pairs (0,1), (2,3), ...
            for (let i = 0; i < n - 1; i += 2) {
                if (stopFlag) return;
                barElements[i].classList.add("comparing");
                barElements[i + 1].classList.add("comparing");
                comparisons++;
                accesses += 2;
                soundCompare(i, i + 1);
                updateStats();
                await sleep(getDelay());

                if (array[i] > array[i + 1]) {
                    barElements[i].classList.remove("comparing");
                    barElements[i + 1].classList.remove("comparing");
                    barElements[i].classList.add("swapping");
                    barElements[i + 1].classList.add("swapping");
                    [array[i], array[i + 1]] = [array[i + 1], array[i]];
                    swaps++;
                    accesses += 4;
                    updateBar(i);
                    updateBar(i + 1);
                    soundSwap(i);
                    updateStats();
                    await sleep(getDelay());
                    barElements[i].classList.remove("swapping");
                    barElements[i + 1].classList.remove("swapping");
                    sorted = false;
                } else {
                    barElements[i].classList.remove("comparing");
                    barElements[i + 1].classList.remove("comparing");
                }
            }
        }
    }

    // ---------- Pancake Sort ----------
    async function pancakeSort() {
        const n = array.length;

        for (let size = n; size > 1; size--) {
            if (stopFlag) return;

            // Find index of max in arr[0..size-1]
            let maxIdx = 0;
            for (let i = 1; i < size; i++) {
                if (stopFlag) return;
                barElements[i].classList.add("comparing");
                barElements[maxIdx].classList.add("pivot");
                comparisons++;
                accesses += 2;
                soundCompare(i, maxIdx);
                updateStats();
                await sleep(getDelay());
                if (array[i] > array[maxIdx]) {
                    barElements[maxIdx].classList.remove("pivot");
                    maxIdx = i;
                    barElements[maxIdx].classList.add("pivot");
                }
                barElements[i].classList.remove("comparing");
            }
            barElements[maxIdx].classList.remove("pivot");

            if (maxIdx === size - 1) {
                barElements[size - 1].classList.add("sorted");
                continue;
            }

            // Flip max to front (if not already there)
            if (maxIdx > 0) {
                await flipSubarray(0, maxIdx);
            }
            // Flip front to correct position
            await flipSubarray(0, size - 1);
            barElements[size - 1].classList.add("sorted");
        }
        barElements[0].classList.add("sorted");
    }

    /** Reverse arr[start..end] with animation. */
    async function flipSubarray(start, end) {
        let lo = start, hi = end;
        // Highlight the flip region
        for (let x = lo; x <= hi; x++) barElements[x].classList.add("active");
        await sleep(getDelay());

        while (lo < hi && !stopFlag) {
            barElements[lo].classList.remove("active");
            barElements[hi].classList.remove("active");
            barElements[lo].classList.add("swapping");
            barElements[hi].classList.add("swapping");
            [array[lo], array[hi]] = [array[hi], array[lo]];
            swaps++;
            accesses += 4;
            updateBar(lo);
            updateBar(hi);
            soundSwap(lo);
            updateStats();
            await sleep(getDelay());
            barElements[lo].classList.remove("swapping");
            barElements[hi].classList.remove("swapping");
            lo++;
            hi--;
        }
        // Clean remaining active
        for (let x = start; x <= end; x++) barElements[x].classList.remove("active");
    }

    // ---------- Cycle Sort ----------
    async function cycleSort() {
        const n = array.length;

        for (let cycleStart = 0; cycleStart < n - 1; cycleStart++) {
            if (stopFlag) return;
            let item = array[cycleStart];
            accesses++;
            barElements[cycleStart].classList.add("pivot");

            // Count how many elements are smaller → determines position
            let pos = cycleStart;
            for (let i = cycleStart + 1; i < n; i++) {
                if (stopFlag) return;
                barElements[i].classList.add("comparing");
                comparisons++;
                accesses++;
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                if (array[i] < item) pos++;
                barElements[i].classList.remove("comparing");
            }

            if (pos === cycleStart) {
                barElements[cycleStart].classList.remove("pivot");
                barElements[cycleStart].classList.add("sorted");
                continue;
            }

            // Skip duplicates
            while (item === array[pos]) {
                pos++;
                accesses++;
            }

            // Place item at its position
            if (pos !== cycleStart) {
                barElements[pos].classList.add("swapping");
                let temp = array[pos];
                array[pos] = item;
                item = temp;
                swaps++;
                accesses += 3;
                updateBar(pos);
                soundSwap(pos);
                updateStats();
                await sleep(getDelay());
                barElements[pos].classList.remove("swapping");
                barElements[pos].classList.add("sorted");
            }

            // Rotate the rest of the cycle
            while (pos !== cycleStart && !stopFlag) {
                pos = cycleStart;
                for (let i = cycleStart + 1; i < n; i++) {
                    if (stopFlag) return;
                    barElements[i].classList.add("comparing");
                    comparisons++;
                    accesses++;
                    updateStats();
                    await sleep(getDelay());
                    if (array[i] < item) pos++;
                    barElements[i].classList.remove("comparing");
                }

                while (item === array[pos]) {
                    pos++;
                    accesses++;
                }

                if (item !== array[pos]) {
                    barElements[pos].classList.add("swapping");
                    let temp = array[pos];
                    array[pos] = item;
                    item = temp;
                    swaps++;
                    accesses += 3;
                    updateBar(pos);
                    soundSwap(pos);
                    updateStats();
                    await sleep(getDelay());
                    barElements[pos].classList.remove("swapping");
                    barElements[pos].classList.add("sorted");
                }
            }

            barElements[cycleStart].classList.remove("pivot");
            barElements[cycleStart].classList.add("sorted");
        }
        barElements[array.length - 1].classList.add("sorted");
    }

    // ---------- Radix Sort (LSD) ----------
    async function radixSortLSD() {
        const n = array.length;
        const max = Math.max(...array);

        for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
            if (stopFlag) return;
            await countingSortByDigit(n, exp);
        }
    }

    async function countingSortByDigit(n, exp) {
        const output = new Array(n);
        const count = new Array(10).fill(0);

        // Count occurrences of each digit
        for (let i = 0; i < n; i++) {
            if (stopFlag) return;
            const digit = Math.floor(array[i] / exp) % 10;
            count[digit]++;
            accesses++;
            barElements[i].classList.add("comparing");
            soundSwap(i);
            await sleep(getDelay());
            barElements[i].classList.remove("comparing");
            updateStats();
        }

        // Cumulative count
        for (let i = 1; i < 10; i++) count[i] += count[i - 1];

        // Build output array (traverse right to left for stability)
        for (let i = n - 1; i >= 0; i--) {
            if (stopFlag) return;
            const digit = Math.floor(array[i] / exp) % 10;
            output[count[digit] - 1] = array[i];
            count[digit]--;
            accesses += 2;
            barElements[i].classList.add("active");
            await sleep(getDelay());
            barElements[i].classList.remove("active");
            updateStats();
        }

        // Copy output back to array with animation
        for (let i = 0; i < n; i++) {
            if (stopFlag) return;
            if (array[i] !== output[i]) {
                array[i] = output[i];
                swaps++;
            }
            accesses += 2;
            updateBar(i);
            barElements[i].classList.add("swapping");
            soundSwap(i);
            updateStats();
            await sleep(getDelay());
            barElements[i].classList.remove("swapping");
        }
    }

    // ---------- Bitonic Sort ----------
    // Bitonic sort requires power-of-2 length. We pad the array,
    // sort, then strip padding — keeping the visual honest.

    async function bitonicSortWrapper() {
        const n = array.length;
        // Next power of 2
        let p = 1;
        while (p < n) p <<= 1;

        const padCount = p - n;
        const maxVal = Math.max(...array);

        // Pad array + bars with sentinel values (larger than any real value)
        for (let i = 0; i < padCount; i++) {
            array.push(maxVal + 1 + i);
            const bar = document.createElement("div");
            bar.className = "bar";
            bar.style.height = "0%";
            bar.style.opacity = "0.15"; // dim so user knows they're padding
            barsContainer.appendChild(bar);
            barElements.push(bar);
        }

        await bitonicSortRec(0, p, true);

        // Strip padding: remove sentinel bars and values
        for (let i = 0; i < padCount; i++) {
            const bar = barElements.pop();
            bar.remove();
            array.pop();
        }

        // Re-render real bars to correct heights (sentinels shifted indices)
        // After stripping, array[0..n-1] holds the original values sorted.
        const realMax = n; // values are 1..n
        for (let i = 0; i < n; i++) {
            barElements[i].style.height = `${(array[i] / realMax) * 100}%`;
            const label = barElements[i].querySelector(".bar-value");
            if (label) label.textContent = array[i];
        }
    }

    async function bitonicSortRec(low, count, ascending) {
        if (count <= 1 || stopFlag) return;
        const half = count >> 1;
        await bitonicSortRec(low, half, true);
        await bitonicSortRec(low + half, half, false);
        await bitonicMerge(low, count, ascending);
    }

    async function bitonicMerge(low, count, ascending) {
        if (count <= 1 || stopFlag) return;
        const half = count >> 1; // always power of 2 now

        for (let i = low; i < low + half; i++) {
            if (stopFlag) return;
            const j = i + half;

            barElements[i].classList.add("comparing");
            barElements[j].classList.add("comparing");
            comparisons++;
            accesses += 2;
            soundCompare(i, j);
            updateStats();
            await sleep(getDelay());

            if ((ascending && array[i] > array[j]) || (!ascending && array[i] < array[j])) {
                barElements[i].classList.remove("comparing");
                barElements[j].classList.remove("comparing");
                barElements[i].classList.add("swapping");
                barElements[j].classList.add("swapping");
                [array[i], array[j]] = [array[j], array[i]];
                swaps++;
                accesses += 4;
                updateBar(i);
                updateBar(j);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                barElements[i].classList.remove("swapping");
                barElements[j].classList.remove("swapping");
            } else {
                barElements[i].classList.remove("comparing");
                barElements[j].classList.remove("comparing");
            }
        }

        await bitonicMerge(low, half, ascending);
        await bitonicMerge(low + half, half, ascending);
    }

    // ---------- Timsort ----------
    // Simplified Timsort: find natural runs, extend them with insertion sort
    // to a minimum run length, then merge pairs bottom-up.

    async function timSort() {
        const n = array.length;
        const MIN_RUN = Math.max(4, Math.min(32, n >> 1));

        // Insertion sort a subarray [left..right]
        async function timInsertionSort(left, right) {
            for (let i = left + 1; i <= right; i++) {
                if (stopFlag) return;
                const key = array[i];
                accesses++;
                barElements[i].classList.add("active");
                let j = i - 1;

                while (j >= left && array[j] > key) {
                    if (stopFlag) return;
                    barElements[j].classList.add("comparing");
                    comparisons++;
                    accesses += 2;
                    soundSwap(j);
                    await sleep(getDelay());
                    array[j + 1] = array[j];
                    accesses += 2;
                    swaps++;
                    updateBar(j + 1);
                    barElements[j].classList.remove("comparing");
                    j--;
                    updateStats();
                }
                array[j + 1] = key;
                accesses++;
                updateBar(j + 1);
                barElements[i].classList.remove("active");
            }
        }

        // Merge two sorted runs [left..mid] and [mid+1..right]
        async function timMerge(left, mid, right) {
            const leftArr = array.slice(left, mid + 1);
            const rightArr = array.slice(mid + 1, right + 1);
            accesses += right - left + 1;
            let i = 0, j = 0, k = left;

            for (let x = left; x <= right; x++) barElements[x].classList.add("active");
            await sleep(getDelay());

            while (i < leftArr.length && j < rightArr.length && !stopFlag) {
                comparisons++;
                accesses += 2;
                barElements[k].classList.add("comparing");
                soundSwap(k);
                await sleep(getDelay());

                if (leftArr[i] <= rightArr[j]) {
                    array[k] = leftArr[i++];
                } else {
                    array[k] = rightArr[j++];
                    swaps++;
                }
                accesses++;
                updateBar(k);
                barElements[k].classList.remove("comparing", "active");
                updateStats();
                k++;
            }

            while (i < leftArr.length && !stopFlag) {
                array[k] = leftArr[i++];
                accesses++;
                updateBar(k);
                soundSwap(k);
                barElements[k].classList.remove("active");
                k++;
                await sleep(getDelay());
            }
            while (j < rightArr.length && !stopFlag) {
                array[k] = rightArr[j++];
                accesses++;
                updateBar(k);
                soundSwap(k);
                barElements[k].classList.remove("active");
                k++;
                await sleep(getDelay());
            }
            for (let x = left; x <= right; x++) barElements[x].classList.remove("active");
        }

        // Step 1: Sort individual runs with insertion sort
        for (let start = 0; start < n; start += MIN_RUN) {
            if (stopFlag) return;
            const end = Math.min(start + MIN_RUN - 1, n - 1);
            await timInsertionSort(start, end);
        }

        // Step 2: Merge runs, doubling size each pass
        for (let size = MIN_RUN; size < n; size *= 2) {
            for (let left = 0; left < n; left += 2 * size) {
                if (stopFlag) return;
                const mid = Math.min(left + size - 1, n - 1);
                const right = Math.min(left + 2 * size - 1, n - 1);
                if (mid < right) {
                    await timMerge(left, mid, right);
                }
            }
        }
    }

    // ---------- IntroSort ----------
    // Quick Sort + Heap Sort fallback + Insertion Sort for small partitions.

    async function introSort() {
        const n = array.length;
        const maxDepth = Math.floor(2 * Math.log2(n));
        await introSortRec(0, n - 1, maxDepth);
    }

    async function introSortRec(low, high, depthLimit) {
        if (stopFlag) return;
        const size = high - low + 1;

        // Small partitions: insertion sort
        if (size <= 16) {
            await introInsertionSort(low, high);
            return;
        }

        // Depth exceeded: switch to heap sort on this sub-range
        if (depthLimit === 0) {
            await introHeapSort(low, high);
            return;
        }

        // Quick sort partition
        const pivot = await introPartition(low, high);
        if (stopFlag) return;
        await introSortRec(low, pivot - 1, depthLimit - 1);
        await introSortRec(pivot + 1, high, depthLimit - 1);
    }

    async function introPartition(low, high) {
        // Median-of-three pivot
        const mid = Math.floor((low + high) / 2);
        if (array[low] > array[mid]) { [array[low], array[mid]] = [array[mid], array[low]]; updateBar(low); updateBar(mid); swaps++; accesses += 4; }
        if (array[low] > array[high]) { [array[low], array[high]] = [array[high], array[low]]; updateBar(low); updateBar(high); swaps++; accesses += 4; }
        if (array[mid] > array[high]) { [array[mid], array[high]] = [array[high], array[mid]]; updateBar(mid); updateBar(high); swaps++; accesses += 4; }
        // Place median at high-1 as pivot
        [array[mid], array[high]] = [array[high], array[mid]];
        updateBar(mid); updateBar(high); swaps++; accesses += 4;

        const pivotVal = array[high];
        barElements[high].classList.add("pivot");
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (stopFlag) return -1;
            barElements[j].classList.add("comparing");
            comparisons++;
            accesses++;
            soundSwap(j);
            updateStats();
            await sleep(getDelay());

            if (array[j] < pivotVal) {
                i++;
                if (i !== j) {
                    barElements[i].classList.add("swapping");
                    barElements[j].classList.add("swapping");
                    [array[i], array[j]] = [array[j], array[i]];
                    swaps++; accesses += 4;
                    updateBar(i); updateBar(j);
                    soundSwap(i);
                    updateStats();
                    await sleep(getDelay());
                    barElements[i].classList.remove("swapping");
                }
                barElements[j].classList.remove("swapping");
            }
            barElements[j].classList.remove("comparing");
        }
        i++;
        if (i !== high) {
            barElements[i].classList.add("swapping");
            [array[i], array[high]] = [array[high], array[i]];
            swaps++; accesses += 4;
            updateBar(i); updateBar(high);
            soundSwap(i);
            updateStats();
            await sleep(getDelay());
            barElements[i].classList.remove("swapping");
        }
        barElements[high].classList.remove("pivot");
        barElements[i].classList.add("sorted");
        return i;
    }

    async function introInsertionSort(low, high) {
        for (let i = low + 1; i <= high; i++) {
            if (stopFlag) return;
            const key = array[i];
            accesses++;
            barElements[i].classList.add("active");
            let j = i - 1;
            while (j >= low && array[j] > key) {
                if (stopFlag) return;
                comparisons++; accesses += 2;
                barElements[j].classList.add("comparing");
                soundSwap(j);
                await sleep(getDelay());
                array[j + 1] = array[j];
                swaps++; accesses += 2;
                updateBar(j + 1);
                barElements[j].classList.remove("comparing");
                j--;
                updateStats();
            }
            array[j + 1] = key;
            accesses++;
            updateBar(j + 1);
            barElements[i].classList.remove("active");
        }
    }

    async function introHeapSort(low, high) {
        const n = high - low + 1;

        async function siftDown(size, root) {
            let largest = root;
            const l = 2 * (root - low) + 1 + low;
            const r = l + 1;
            if (l <= low + size - 1) {
                comparisons++; accesses += 2;
                barElements[l].classList.add("comparing");
                soundSwap(l);
                await sleep(getDelay());
                if (array[l] > array[largest]) largest = l;
                barElements[l].classList.remove("comparing");
            }
            if (r <= low + size - 1) {
                comparisons++; accesses += 2;
                barElements[r].classList.add("comparing");
                soundSwap(r);
                await sleep(getDelay());
                if (array[r] > array[largest]) largest = r;
                barElements[r].classList.remove("comparing");
            }
            updateStats();
            if (largest !== root && !stopFlag) {
                barElements[root].classList.add("swapping");
                barElements[largest].classList.add("swapping");
                [array[root], array[largest]] = [array[largest], array[root]];
                swaps++; accesses += 4;
                updateBar(root); updateBar(largest);
                soundSwap(root);
                updateStats();
                await sleep(getDelay());
                barElements[root].classList.remove("swapping");
                barElements[largest].classList.remove("swapping");
                await siftDown(size, largest);
            }
        }

        // Build max heap
        for (let i = low + Math.floor(n / 2) - 1; i >= low; i--) {
            if (stopFlag) return;
            await siftDown(n, i);
        }
        // Extract
        for (let i = high; i > low; i--) {
            if (stopFlag) return;
            barElements[low].classList.add("swapping");
            barElements[i].classList.add("swapping");
            [array[low], array[i]] = [array[i], array[low]];
            swaps++; accesses += 4;
            updateBar(low); updateBar(i);
            soundSwap(low);
            updateStats();
            await sleep(getDelay());
            barElements[low].classList.remove("swapping");
            barElements[i].classList.remove("swapping");
            barElements[i].classList.add("sorted");
            await siftDown(i - low, low);
        }
        barElements[low].classList.add("sorted");
    }

    // ---------- Flashsort ----------
    async function flashSort() {
        const n = array.length;
        if (n <= 1) return;

        const m = Math.max(Math.floor(0.45 * n), 2); // number of classes
        let min = array[0], max = array[0], maxIdx = 0;
        accesses += 2;

        // Find min and max
        for (let i = 1; i < n; i++) {
            if (stopFlag) return;
            accesses++;
            barElements[i].classList.add("comparing");
            soundSwap(i);
            comparisons++;
            await sleep(getDelay());
            if (array[i] < min) min = array[i];
            if (array[i] > max) { max = array[i]; maxIdx = i; }
            barElements[i].classList.remove("comparing");
            updateStats();
        }

        if (min === max) return; // all equal

        const c1 = (m - 1) / (max - min);
        const L = new Array(m).fill(0);

        // Distribution counting
        for (let i = 0; i < n; i++) {
            const k = Math.floor(c1 * (array[i] - min));
            L[k]++;
            accesses++;
        }

        // Prefix sum
        for (let k = 1; k < m; k++) L[k] += L[k - 1];

        // Move max to position 0
        if (maxIdx !== 0) {
            barElements[0].classList.add("swapping");
            barElements[maxIdx].classList.add("swapping");
            [array[0], array[maxIdx]] = [array[maxIdx], array[0]];
            swaps++; accesses += 4;
            updateBar(0); updateBar(maxIdx);
            soundSwap(0);
            updateStats();
            await sleep(getDelay());
            barElements[0].classList.remove("swapping");
            barElements[maxIdx].classList.remove("swapping");
        }

        // Permutation cycle
        let move = 0, j = 0, k = m - 1;
        let flash;
        while (move < n - 1 && !stopFlag) {
            while (j >= L[k] && !stopFlag) {
                j++;
                if (j < n) k = Math.floor(c1 * (array[j] - min));
                else break;
            }
            if (j >= n) break;
            flash = array[j];
            accesses++;
            while (j < L[k] && !stopFlag) {
                k = Math.floor(c1 * (flash - min));
                const dest = L[k] - 1;
                barElements[dest].classList.add("swapping");
                barElements[j].classList.add("active");
                const temp = array[dest];
                array[dest] = flash;
                flash = temp;
                swaps++; accesses += 3;
                updateBar(dest);
                soundSwap(dest);
                updateStats();
                await sleep(getDelay());
                barElements[dest].classList.remove("swapping");
                barElements[j].classList.remove("active");
                L[k]--;
                move++;
            }
        }

        // Final pass: insertion sort to fix remaining disorder
        for (let i = 1; i < n; i++) {
            if (stopFlag) return;
            const key = array[i];
            accesses++;
            let jj = i - 1;
            barElements[i].classList.add("active");

            while (jj >= 0 && array[jj] > key) {
                if (stopFlag) return;
                comparisons++; accesses += 2;
                barElements[jj].classList.add("comparing");
                soundSwap(jj);
                await sleep(getDelay());
                array[jj + 1] = array[jj];
                swaps++; accesses += 2;
                updateBar(jj + 1);
                barElements[jj].classList.remove("comparing");
                jj--;
                updateStats();
            }
            array[jj + 1] = key;
            accesses++;
            updateBar(jj + 1);
            barElements[i].classList.remove("active");
        }
    }

    // ---------- Library Sort (Gapped Insertion Sort) ----------
    async function librarySort() {
        const n = array.length;
        const GAP_FACTOR = 2; // internal array is 2× size with gaps
        const size = n * GAP_FACTOR;
        const EMPTY = -1;
        const lib = new Array(size).fill(EMPTY);

        // Insert first element in the middle
        const mid = Math.floor(size / 2);
        lib[mid] = array[0];
        accesses++;
        barElements[0].classList.add("active");
        soundSwap(0);
        await sleep(getDelay());
        barElements[0].classList.remove("active");
        let filled = 1;

        for (let i = 1; i < n; i++) {
            if (stopFlag) return;
            const val = array[i];
            accesses++;
            barElements[i].classList.add("active");

            // Binary search for insert position in lib
            let lo = 0, hi = size - 1;
            while (lo <= hi) {
                const m = Math.floor((lo + hi) / 2);
                if (lib[m] === EMPTY) {
                    // Search for nearest filled spot
                    let left = m, right = m;
                    while (left >= lo && lib[left] === EMPTY) left--;
                    while (right <= hi && lib[right] === EMPTY) right++;
                    if (left >= lo && lib[left] !== EMPTY) {
                        comparisons++;
                        if (lib[left] <= val) lo = m + 1;
                        else hi = m - 1;
                    } else if (right <= hi && lib[right] !== EMPTY) {
                        comparisons++;
                        if (lib[right] <= val) lo = right + 1;
                        else hi = m - 1;
                    } else break;
                } else {
                    comparisons++;
                    if (lib[m] <= val) lo = m + 1;
                    else hi = m - 1;
                }
            }
            updateStats();

            // Find nearest empty slot to 'lo'
            let pos = lo;
            if (pos >= size) pos = size - 1;
            if (lib[pos] !== EMPTY) {
                let left = pos, right = pos;
                while (left >= 0 && lib[left] !== EMPTY) left--;
                while (right < size && lib[right] !== EMPTY) right++;
                // Shift toward the closer empty side
                if (left >= 0 && (right >= size || (pos - left) <= (right - pos))) {
                    for (let s = left; s < pos; s++) { lib[s] = lib[s + 1]; swaps++; }
                    pos--;
                } else if (right < size) {
                    for (let s = right; s > pos; s--) { lib[s] = lib[s - 1]; swaps++; }
                }
            }
            lib[pos] = val;
            filled++;

            // Visualize: rebuild array from gapped library
            let idx = 0;
            for (let g = 0; g < size && idx < n; g++) {
                if (lib[g] !== EMPTY) {
                    array[idx] = lib[g];
                    updateBar(idx);
                    idx++;
                }
            }
            // Fill remaining positions with 0 temporarily
            while (idx < n) { array[idx] = 0; updateBar(idx); idx++; }

            soundSwap(Math.min(i, n - 1));
            updateStats();
            await sleep(getDelay());
            barElements[i].classList.remove("active");
        }

        // Final: extract sorted values from lib
        let idx = 0;
        for (let g = 0; g < size && idx < n; g++) {
            if (lib[g] !== EMPTY) {
                array[idx] = lib[g];
                updateBar(idx);
                soundSwap(idx);
                barElements[idx].classList.add("sorted");
                idx++;
                await sleep(getDelay());
            }
        }
    }

    // ---------- Stooge Sort ----------
    async function stoogeSort(lo, hi) {
        if (stopFlag) return;
        if (lo >= hi) return;

        barElements[lo].classList.add("comparing");
        barElements[hi].classList.add("comparing");
        comparisons++;
        accesses += 2;
        soundCompare(lo, hi);
        updateStats();
        await sleep(getDelay());

        if (array[lo] > array[hi]) {
            barElements[lo].classList.remove("comparing");
            barElements[hi].classList.remove("comparing");
            barElements[lo].classList.add("swapping");
            barElements[hi].classList.add("swapping");
            [array[lo], array[hi]] = [array[hi], array[lo]];
            swaps++;
            accesses += 4;
            updateBar(lo);
            updateBar(hi);
            soundSwap(lo);
            updateStats();
            await sleep(getDelay());
            barElements[lo].classList.remove("swapping");
            barElements[hi].classList.remove("swapping");
        } else {
            barElements[lo].classList.remove("comparing");
            barElements[hi].classList.remove("comparing");
        }

        if (hi - lo + 1 > 2) {
            const t = Math.floor((hi - lo + 1) / 3);
            await stoogeSort(lo, hi - t);       // first 2/3
            await stoogeSort(lo + t, hi);       // last 2/3
            await stoogeSort(lo, hi - t);       // first 2/3 again
        }
    }

    // ---------- Bogo Sort ----------
    async function bogoSort() {
        const MAX_ATTEMPTS = 500000; // safety limit
        let attempts = 0;

        function isSorted() {
            for (let i = 0; i < array.length - 1; i++) {
                accesses += 2;
                comparisons++;
                if (array[i] > array[i + 1]) return false;
            }
            return true;
        }

        // Visualize the check
        async function visualCheck() {
            for (let i = 0; i < array.length - 1; i++) {
                if (stopFlag) return false;
                barElements[i].classList.add("comparing");
                barElements[i + 1].classList.add("comparing");
                soundCompare(i, i + 1);
                await sleep(Math.min(getDelay(), 30));
                const sorted = array[i] <= array[i + 1];
                barElements[i].classList.remove("comparing");
                barElements[i + 1].classList.remove("comparing");
                if (!sorted) return false;
            }
            return true;
        }

        while (!stopFlag && attempts < MAX_ATTEMPTS) {
            attempts++;
            updateStats();

            if (await visualCheck()) return;
            if (stopFlag) return;

            // Fisher-Yates shuffle with animation
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                if (i !== j) {
                    barElements[i].classList.add("swapping");
                    barElements[j].classList.add("swapping");
                    [array[i], array[j]] = [array[j], array[i]];
                    swaps++;
                    accesses += 4;
                    updateBar(i);
                    updateBar(j);
                    soundSwap(i);
                    await sleep(Math.min(getDelay(), 15));
                    barElements[i].classList.remove("swapping");
                    barElements[j].classList.remove("swapping");
                }
            }
            updateStats();
        }
    }

    // ---------- Sleep Sort ----------
    async function sleepSort() {
        const n = array.length;
        const maxVal = Math.max(...array);
        const result = [];
        let resolved = 0;

        // Mark all bars as active
        for (let i = 0; i < n; i++) barElements[i].classList.add("active");
        await sleep(getDelay());

        // Each element "sleeps" proportionally to its value, then "wakes up"
        return new Promise((resolve) => {
            const baseDelay = Math.max(20, getDelay() * 2);

            for (let i = 0; i < n; i++) {
                const val = array[i];
                const sleepTime = (val / maxVal) * baseDelay * n;
                accesses++;

                setTimeout(() => {
                    if (stopFlag) {
                        resolved++;
                        if (resolved === n) resolve();
                        return;
                    }
                    result.push(val);
                    const idx = result.length - 1;

                    // Place value in sorted position
                    array[idx] = val;
                    updateBar(idx);
                    barElements[idx].classList.remove("active", "comparing");
                    barElements[idx].classList.add("sorted");
                    soundSwap(idx);
                    swaps++;
                    updateStats();

                    resolved++;
                    if (resolved === n) resolve();
                }, sleepTime);
            }
        });
    }

    // ===== Algorithm Dispatcher =====
    const algorithms = {
        bubble:    bubbleSort,
        selection: selectionSort,
        insertion: insertionSort,
        quick:     () => quickSort(0, array.length - 1),
        merge:     () => mergeSort(0, array.length - 1),
        heap:      heapSort,
        shell:     shellSort,
        cocktail:  cocktailSort,
        comb:      combSort,
        gnome:     gnomeSort,
        oddeven:   oddEvenSort,
        pancake:   pancakeSort,
        cycle:     cycleSort,
        radix:     radixSortLSD,
        bitonic:   bitonicSortWrapper,
        tim:       timSort,
        intro:     introSort,
        flash:     flashSort,
        library:   librarySort,
        stooge:    () => stoogeSort(0, array.length - 1),
        bogo:      bogoSort,
        sleep:     sleepSort,
    };

    // ===== Event Handlers =====

    function initArray() {
        const size = parseInt(sizeSlider.value, 10);
        array = generateArray(size);
        renderBars();
        resetStats();
    }

    function updateAlgoInfo() {
        const opt = algoSelect.selectedOptions[0];
        algoName.textContent = opt.textContent.trim();
        algoTimeAvg.textContent = opt.dataset.timeAvg;
        algoTimeWorst.textContent = opt.dataset.timeWorst;
        algoSpace.textContent = opt.dataset.space;
        algoDescription.textContent = opt.dataset.description;
    }

    sizeSlider.addEventListener("input", () => {
        sizeValue.textContent = sizeSlider.value;
        if (!sorting) initArray();
    });

    speedSlider.addEventListener("input", () => {
        speedValue.textContent = speedSlider.value;
    });

    algoSelect.addEventListener("change", () => {
        updateAlgoInfo();
    });

    btnGenerate.addEventListener("click", () => {
        if (!sorting) initArray();
    });

    btnStop.addEventListener("click", () => {
        stopFlag = true;
    });

    // Audio controls
    btnMute.addEventListener("click", () => {
        isMuted = !isMuted;
        iconUnmuted.style.display = isMuted ? "none" : "";
        iconMuted.style.display = isMuted ? "" : "none";
        btnMute.classList.toggle("muted", isMuted);
    });

    volumeSlider.addEventListener("input", () => {
        applyVolume();
        // Un-mute when user drags volume up
        if (isMuted && parseInt(volumeSlider.value, 10) > 0) {
            isMuted = false;
            iconUnmuted.style.display = "";
            iconMuted.style.display = "none";
            btnMute.classList.remove("muted");
        }
    });

    btnStart.addEventListener("click", async () => {
        const algoId = algoSelect.value;
        const sortFn = algorithms[algoId];
        if (!sortFn) return;

        // Ensure audio context is ready (requires user gesture)
        ensureAudioCtx();

        // Reset
        stopFlag = false;
        clearBarStates();
        resetStats();
        setUISorting(true);
        startTimer();

        await sortFn();

        stopTimer();

        if (!stopFlag) {
            await celebrationSweep();
        }

        setUISorting(false);
        stopFlag = false;
    });

    // ===== Init =====
    updateAlgoInfo();
    initArray();
})();
