/**
 * All sorting algorithm implementations.
 *
 * Key architectural changes:
 *   – Shared state via S (import from state.js) instead of closure variables.
 *   – sleep() rejects with AbortError on abort → no manual stopFlag polling
 *     needed after every await.  Explicit isAborted() checks are kept only
 *     at recursion/loop entry points for responsiveness.
 *   – Bogo Sort is capped at 8 elements (enforced by caller in main.js).
 *   – Sleep Sort stores timer IDs and clears them on abort.
 */

import { S, isAborted } from './state.js';
import {
    updateBar, sleep, getDelay, updateStats,
    addPaddingBar, removePaddingBar,
} from './ui.js';
import { soundCompare, soundSwap } from './audio.js';

// =====================================================================
//  Bubble Sort
// =====================================================================
async function bubbleSort() {
    const n = S.array.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            S.barElements[j].classList.add('comparing');
            S.barElements[j + 1].classList.add('comparing');
            S.accesses += 2;
            S.comparisons++;
            soundCompare(j, j + 1);
            updateStats();
            await sleep(getDelay());

            if (S.array[j] > S.array[j + 1]) {
                S.barElements[j].classList.remove('comparing');
                S.barElements[j + 1].classList.remove('comparing');
                S.barElements[j].classList.add('swapping');
                S.barElements[j + 1].classList.add('swapping');
                [S.array[j], S.array[j + 1]] = [S.array[j + 1], S.array[j]];
                S.swaps++;
                S.accesses += 4;
                updateBar(j);
                updateBar(j + 1);
                soundSwap(j);
                updateStats();
                await sleep(getDelay());
                S.barElements[j].classList.remove('swapping');
                S.barElements[j + 1].classList.remove('swapping');
            } else {
                S.barElements[j].classList.remove('comparing');
                S.barElements[j + 1].classList.remove('comparing');
            }
        }
        S.barElements[n - i - 1].classList.add('sorted');
    }
    S.barElements[0].classList.add('sorted');
}

// =====================================================================
//  Selection Sort
// =====================================================================
async function selectionSort() {
    const n = S.array.length;
    for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        S.barElements[i].classList.add('active');

        for (let j = i + 1; j < n; j++) {
            S.barElements[j].classList.add('comparing');
            S.accesses += 2;
            S.comparisons++;
            soundCompare(j, minIdx);
            updateStats();
            await sleep(getDelay());

            if (S.array[j] < S.array[minIdx]) {
                if (minIdx !== i) S.barElements[minIdx].classList.remove('pivot');
                minIdx = j;
                S.barElements[minIdx].classList.add('pivot');
            }
            S.barElements[j].classList.remove('comparing');
        }

        if (minIdx !== i) {
            S.barElements[i].classList.add('swapping');
            S.barElements[minIdx].classList.add('swapping');
            [S.array[i], S.array[minIdx]] = [S.array[minIdx], S.array[i]];
            S.swaps++;
            S.accesses += 4;
            updateBar(i);
            updateBar(minIdx);
            soundSwap(i);
            updateStats();
            await sleep(getDelay());
            S.barElements[i].classList.remove('swapping');
            S.barElements[minIdx].classList.remove('swapping');
            S.barElements[minIdx].classList.remove('pivot');
        }
        S.barElements[i].classList.remove('active');
        S.barElements[i].classList.add('sorted');
    }
    S.barElements[S.array.length - 1].classList.add('sorted');
}

// =====================================================================
//  Insertion Sort
// =====================================================================
async function insertionSort() {
    const n = S.array.length;
    S.barElements[0].classList.add('sorted');

    for (let i = 1; i < n; i++) {
        const key = S.array[i];
        S.accesses++;
        let j = i - 1;
        S.barElements[i].classList.add('active');
        await sleep(getDelay());

        while (j >= 0 && S.array[j] > key) {
            S.barElements[j].classList.add('comparing');
            S.comparisons++;
            S.accesses += 2;
            soundSwap(j);
            await sleep(getDelay());

            S.array[j + 1] = S.array[j];
            S.accesses += 2;
            S.swaps++;
            updateBar(j + 1);
            soundSwap(j + 1);
            S.barElements[j].classList.remove('comparing');
            j--;
            updateStats();
        }
        if (j + 1 < n) S.comparisons++;

        S.array[j + 1] = key;
        S.accesses++;
        updateBar(j + 1);
        S.barElements[i].classList.remove('active');

        for (let k = 0; k <= i; k++) S.barElements[k].classList.add('sorted');
        updateStats();
    }
}

// =====================================================================
//  Quick Sort
// =====================================================================
async function quickSort(low = 0, high = S.array.length - 1) {
    if (low >= high || isAborted()) {
        if (low === high && low >= 0 && low < S.array.length) S.barElements[low].classList.add('sorted');
        return;
    }
    const pi = await _qsPartition(low, high);
    await quickSort(low, pi - 1);
    await quickSort(pi + 1, high);
}

async function _qsPartition(low, high) {
    const pivotVal = S.array[high];
    S.accesses++;
    S.barElements[high].classList.add('pivot');
    let i = low - 1;

    for (let j = low; j < high; j++) {
        S.barElements[j].classList.add('comparing');
        S.accesses++;
        S.comparisons++;
        soundSwap(j);
        updateStats();
        await sleep(getDelay());

        if (S.array[j] < pivotVal) {
            i++;
            if (i !== j) {
                S.barElements[i].classList.add('swapping');
                S.barElements[j].classList.add('swapping');
                [S.array[i], S.array[j]] = [S.array[j], S.array[i]];
                S.swaps++;
                S.accesses += 4;
                updateBar(i);
                updateBar(j);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                S.barElements[i].classList.remove('swapping');
            }
            S.barElements[j].classList.remove('swapping');
        }
        S.barElements[j].classList.remove('comparing');
    }

    i++;
    if (i !== high) {
        S.barElements[i].classList.add('swapping');
        S.barElements[high].classList.add('swapping');
        [S.array[i], S.array[high]] = [S.array[high], S.array[i]];
        S.swaps++;
        S.accesses += 4;
        updateBar(i);
        updateBar(high);
        soundSwap(i);
        updateStats();
        await sleep(getDelay());
        S.barElements[high].classList.remove('swapping');
    }
    S.barElements[high].classList.remove('pivot');
    S.barElements[i].classList.remove('swapping');
    S.barElements[i].classList.add('sorted');
    return i;
}

// =====================================================================
//  Merge Sort
// =====================================================================
async function mergeSort(left = 0, right = S.array.length - 1) {
    if (left >= right || isAborted()) return;
    const mid = Math.floor((left + right) / 2);
    await mergeSort(left, mid);
    await mergeSort(mid + 1, right);
    await _msMerge(left, mid, right);
}

async function _msMerge(left, mid, right) {
    const leftArr  = S.array.slice(left, mid + 1);
    const rightArr = S.array.slice(mid + 1, right + 1);
    S.accesses += right - left + 1;
    let i = 0, j = 0, k = left;

    for (let x = left; x <= right; x++) S.barElements[x].classList.add('active');
    await sleep(getDelay());

    while (i < leftArr.length && j < rightArr.length) {
        S.comparisons++;
        S.accesses += 2;
        S.barElements[k].classList.add('comparing');
        soundSwap(k);
        await sleep(getDelay());

        if (leftArr[i] <= rightArr[j]) {
            S.array[k] = leftArr[i++];
        } else {
            S.array[k] = rightArr[j++];
            S.swaps++;
        }
        S.accesses++;
        updateBar(k);
        soundSwap(k);
        S.barElements[k].classList.remove('comparing', 'active');
        S.barElements[k].classList.add('sorted');
        updateStats();
        k++;
    }

    while (i < leftArr.length) {
        S.array[k] = leftArr[i++];
        S.accesses++;
        updateBar(k);
        soundSwap(k);
        S.barElements[k].classList.remove('active');
        S.barElements[k].classList.add('sorted');
        k++;
        await sleep(getDelay());
    }
    while (j < rightArr.length) {
        S.array[k] = rightArr[j++];
        S.accesses++;
        updateBar(k);
        soundSwap(k);
        S.barElements[k].classList.remove('active');
        S.barElements[k].classList.add('sorted');
        k++;
        await sleep(getDelay());
    }

    for (let x = left; x <= right; x++) S.barElements[x].classList.remove('active');
}

// =====================================================================
//  Heap Sort
// =====================================================================
async function heapSort() {
    const n = S.array.length;

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) await _heapify(n, i);

    for (let i = n - 1; i > 0; i--) {
        S.barElements[0].classList.add('swapping');
        S.barElements[i].classList.add('swapping');
        [S.array[0], S.array[i]] = [S.array[i], S.array[0]];
        S.swaps++;
        S.accesses += 4;
        updateBar(0);
        updateBar(i);
        soundSwap(0);
        updateStats();
        await sleep(getDelay());
        S.barElements[0].classList.remove('swapping');
        S.barElements[i].classList.remove('swapping');
        S.barElements[i].classList.add('sorted');
        await _heapify(i, 0);
    }
    S.barElements[0].classList.add('sorted');
}

async function _heapify(n, i) {
    let largest = i;
    const left  = 2 * i + 1;
    const right = 2 * i + 2;

    S.barElements[i].classList.add('active');

    if (left < n) {
        S.accesses += 2; S.comparisons++;
        S.barElements[left].classList.add('comparing');
        soundSwap(left);
        await sleep(getDelay());
        if (S.array[left] > S.array[largest]) largest = left;
        S.barElements[left].classList.remove('comparing');
    }
    if (right < n) {
        S.accesses += 2; S.comparisons++;
        S.barElements[right].classList.add('comparing');
        soundSwap(right);
        await sleep(getDelay());
        if (S.array[right] > S.array[largest]) largest = right;
        S.barElements[right].classList.remove('comparing');
    }
    updateStats();
    S.barElements[i].classList.remove('active');

    if (largest !== i) {
        S.barElements[i].classList.add('swapping');
        S.barElements[largest].classList.add('swapping');
        [S.array[i], S.array[largest]] = [S.array[largest], S.array[i]];
        S.swaps++;
        S.accesses += 4;
        updateBar(i);
        updateBar(largest);
        soundSwap(i);
        updateStats();
        await sleep(getDelay());
        S.barElements[i].classList.remove('swapping');
        S.barElements[largest].classList.remove('swapping');
        await _heapify(n, largest);
    }
}

// =====================================================================
//  Shell Sort
// =====================================================================
async function shellSort() {
    const n = S.array.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        for (let i = gap; i < n; i++) {
            const temp = S.array[i];
            S.accesses++;
            S.barElements[i].classList.add('active');
            let j = i;

            while (j >= gap) {
                S.barElements[j - gap].classList.add('comparing');
                S.comparisons++;
                S.accesses += 2;
                soundSwap(j - gap);
                updateStats();
                await sleep(getDelay());

                if (S.array[j - gap] > temp) {
                    S.array[j] = S.array[j - gap];
                    S.accesses += 2;
                    S.swaps++;
                    updateBar(j);
                    soundSwap(j);
                    S.barElements[j - gap].classList.remove('comparing');
                    j -= gap;
                } else {
                    S.barElements[j - gap].classList.remove('comparing');
                    break;
                }
            }
            S.array[j] = temp;
            S.accesses++;
            updateBar(j);
            S.barElements[i].classList.remove('active');
            updateStats();
        }
    }
}

// =====================================================================
//  Cocktail Shaker Sort
// =====================================================================
async function cocktailSort() {
    const n = S.array.length;
    let start = 0, end = n - 1, swapped = true;

    while (swapped) {
        swapped = false;

        for (let i = start; i < end; i++) {
            S.barElements[i].classList.add('comparing');
            S.barElements[i + 1].classList.add('comparing');
            S.comparisons++;
            S.accesses += 2;
            soundCompare(i, i + 1);
            updateStats();
            await sleep(getDelay());

            if (S.array[i] > S.array[i + 1]) {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + 1].classList.remove('comparing');
                S.barElements[i].classList.add('swapping');
                S.barElements[i + 1].classList.add('swapping');
                [S.array[i], S.array[i + 1]] = [S.array[i + 1], S.array[i]];
                S.swaps++;
                S.accesses += 4;
                updateBar(i);
                updateBar(i + 1);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                S.barElements[i].classList.remove('swapping');
                S.barElements[i + 1].classList.remove('swapping');
                swapped = true;
            } else {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + 1].classList.remove('comparing');
            }
        }
        S.barElements[end].classList.add('sorted');
        end--;

        if (!swapped) break;
        swapped = false;

        for (let i = end; i > start; i--) {
            S.barElements[i].classList.add('comparing');
            S.barElements[i - 1].classList.add('comparing');
            S.comparisons++;
            S.accesses += 2;
            soundCompare(i, i - 1);
            updateStats();
            await sleep(getDelay());

            if (S.array[i] < S.array[i - 1]) {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i - 1].classList.remove('comparing');
                S.barElements[i].classList.add('swapping');
                S.barElements[i - 1].classList.add('swapping');
                [S.array[i], S.array[i - 1]] = [S.array[i - 1], S.array[i]];
                S.swaps++;
                S.accesses += 4;
                updateBar(i);
                updateBar(i - 1);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                S.barElements[i].classList.remove('swapping');
                S.barElements[i - 1].classList.remove('swapping');
                swapped = true;
            } else {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i - 1].classList.remove('comparing');
            }
        }
        S.barElements[start].classList.add('sorted');
        start++;
    }

    for (let i = start; i <= end; i++) S.barElements[i].classList.add('sorted');
}

// =====================================================================
//  Comb Sort
// =====================================================================
async function combSort() {
    const n = S.array.length;
    let gap = n;
    const shrink = 1.3;
    let sorted = false;

    while (!sorted) {
        gap = Math.floor(gap / shrink);
        if (gap <= 1) { gap = 1; sorted = true; }

        for (let i = 0; i + gap < n; i++) {
            S.barElements[i].classList.add('comparing');
            S.barElements[i + gap].classList.add('comparing');
            S.comparisons++;
            S.accesses += 2;
            soundCompare(i, i + gap);
            updateStats();
            await sleep(getDelay());

            if (S.array[i] > S.array[i + gap]) {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + gap].classList.remove('comparing');
                S.barElements[i].classList.add('swapping');
                S.barElements[i + gap].classList.add('swapping');
                [S.array[i], S.array[i + gap]] = [S.array[i + gap], S.array[i]];
                S.swaps++;
                S.accesses += 4;
                updateBar(i);
                updateBar(i + gap);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                S.barElements[i].classList.remove('swapping');
                S.barElements[i + gap].classList.remove('swapping');
                sorted = false;
            } else {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + gap].classList.remove('comparing');
            }
        }
    }
}

// =====================================================================
//  Gnome Sort
// =====================================================================
async function gnomeSort() {
    const n = S.array.length;
    let pos = 0;

    while (pos < n) {
        if (pos === 0) { pos++; continue; }

        S.barElements[pos].classList.add('comparing');
        S.barElements[pos - 1].classList.add('comparing');
        S.comparisons++;
        S.accesses += 2;
        soundCompare(pos, pos - 1);
        updateStats();
        await sleep(getDelay());

        if (S.array[pos] >= S.array[pos - 1]) {
            S.barElements[pos].classList.remove('comparing');
            S.barElements[pos - 1].classList.remove('comparing');
            pos++;
        } else {
            S.barElements[pos].classList.remove('comparing');
            S.barElements[pos - 1].classList.remove('comparing');
            S.barElements[pos].classList.add('swapping');
            S.barElements[pos - 1].classList.add('swapping');
            [S.array[pos], S.array[pos - 1]] = [S.array[pos - 1], S.array[pos]];
            S.swaps++;
            S.accesses += 4;
            updateBar(pos);
            updateBar(pos - 1);
            soundSwap(pos);
            updateStats();
            await sleep(getDelay());
            S.barElements[pos].classList.remove('swapping');
            S.barElements[pos - 1].classList.remove('swapping');
            pos--;
        }
    }
}

// =====================================================================
//  Odd-Even Sort
// =====================================================================
async function oddEvenSort() {
    const n = S.array.length;
    let sorted = false;

    while (!sorted) {
        sorted = true;

        for (let i = 1; i < n - 1; i += 2) {
            S.barElements[i].classList.add('comparing');
            S.barElements[i + 1].classList.add('comparing');
            S.comparisons++;
            S.accesses += 2;
            soundCompare(i, i + 1);
            updateStats();
            await sleep(getDelay());

            if (S.array[i] > S.array[i + 1]) {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + 1].classList.remove('comparing');
                S.barElements[i].classList.add('swapping');
                S.barElements[i + 1].classList.add('swapping');
                [S.array[i], S.array[i + 1]] = [S.array[i + 1], S.array[i]];
                S.swaps++;
                S.accesses += 4;
                updateBar(i);
                updateBar(i + 1);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                S.barElements[i].classList.remove('swapping');
                S.barElements[i + 1].classList.remove('swapping');
                sorted = false;
            } else {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + 1].classList.remove('comparing');
            }
        }

        for (let i = 0; i < n - 1; i += 2) {
            S.barElements[i].classList.add('comparing');
            S.barElements[i + 1].classList.add('comparing');
            S.comparisons++;
            S.accesses += 2;
            soundCompare(i, i + 1);
            updateStats();
            await sleep(getDelay());

            if (S.array[i] > S.array[i + 1]) {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + 1].classList.remove('comparing');
                S.barElements[i].classList.add('swapping');
                S.barElements[i + 1].classList.add('swapping');
                [S.array[i], S.array[i + 1]] = [S.array[i + 1], S.array[i]];
                S.swaps++;
                S.accesses += 4;
                updateBar(i);
                updateBar(i + 1);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                S.barElements[i].classList.remove('swapping');
                S.barElements[i + 1].classList.remove('swapping');
                sorted = false;
            } else {
                S.barElements[i].classList.remove('comparing');
                S.barElements[i + 1].classList.remove('comparing');
            }
        }
    }
}

// =====================================================================
//  Pancake Sort
// =====================================================================
async function pancakeSort() {
    const n = S.array.length;

    for (let size = n; size > 1; size--) {
        let maxIdx = 0;
        for (let i = 1; i < size; i++) {
            S.barElements[i].classList.add('comparing');
            S.barElements[maxIdx].classList.add('pivot');
            S.comparisons++;
            S.accesses += 2;
            soundCompare(i, maxIdx);
            updateStats();
            await sleep(getDelay());
            if (S.array[i] > S.array[maxIdx]) {
                S.barElements[maxIdx].classList.remove('pivot');
                maxIdx = i;
                S.barElements[maxIdx].classList.add('pivot');
            }
            S.barElements[i].classList.remove('comparing');
        }
        S.barElements[maxIdx].classList.remove('pivot');

        if (maxIdx === size - 1) {
            S.barElements[size - 1].classList.add('sorted');
            continue;
        }

        if (maxIdx > 0) await _flip(0, maxIdx);
        await _flip(0, size - 1);
        S.barElements[size - 1].classList.add('sorted');
    }
    S.barElements[0].classList.add('sorted');
}

async function _flip(start, end) {
    let lo = start, hi = end;
    for (let x = lo; x <= hi; x++) S.barElements[x].classList.add('active');
    await sleep(getDelay());

    while (lo < hi) {
        S.barElements[lo].classList.remove('active');
        S.barElements[hi].classList.remove('active');
        S.barElements[lo].classList.add('swapping');
        S.barElements[hi].classList.add('swapping');
        [S.array[lo], S.array[hi]] = [S.array[hi], S.array[lo]];
        S.swaps++;
        S.accesses += 4;
        updateBar(lo);
        updateBar(hi);
        soundSwap(lo);
        updateStats();
        await sleep(getDelay());
        S.barElements[lo].classList.remove('swapping');
        S.barElements[hi].classList.remove('swapping');
        lo++;
        hi--;
    }
    for (let x = start; x <= end; x++) S.barElements[x].classList.remove('active');
}

// =====================================================================
//  Cycle Sort
// =====================================================================
async function cycleSort() {
    const n = S.array.length;

    for (let cycleStart = 0; cycleStart < n - 1; cycleStart++) {
        let item = S.array[cycleStart];
        S.accesses++;
        S.barElements[cycleStart].classList.add('pivot');

        let pos = cycleStart;
        for (let i = cycleStart + 1; i < n; i++) {
            S.barElements[i].classList.add('comparing');
            S.comparisons++;
            S.accesses++;
            soundSwap(i);
            updateStats();
            await sleep(getDelay());
            if (S.array[i] < item) pos++;
            S.barElements[i].classList.remove('comparing');
        }

        if (pos === cycleStart) {
            S.barElements[cycleStart].classList.remove('pivot');
            S.barElements[cycleStart].classList.add('sorted');
            continue;
        }

        while (item === S.array[pos]) { pos++; S.accesses++; }

        if (pos !== cycleStart) {
            S.barElements[pos].classList.add('swapping');
            let tmp = S.array[pos];
            S.array[pos] = item;
            item = tmp;
            S.swaps++;
            S.accesses += 3;
            updateBar(pos);
            soundSwap(pos);
            updateStats();
            await sleep(getDelay());
            S.barElements[pos].classList.remove('swapping');
            S.barElements[pos].classList.add('sorted');
        }

        while (pos !== cycleStart) {
            pos = cycleStart;
            for (let i = cycleStart + 1; i < n; i++) {
                S.barElements[i].classList.add('comparing');
                S.comparisons++;
                S.accesses++;
                updateStats();
                await sleep(getDelay());
                if (S.array[i] < item) pos++;
                S.barElements[i].classList.remove('comparing');
            }

            while (item === S.array[pos]) { pos++; S.accesses++; }

            if (item !== S.array[pos]) {
                S.barElements[pos].classList.add('swapping');
                let tmp = S.array[pos];
                S.array[pos] = item;
                item = tmp;
                S.swaps++;
                S.accesses += 3;
                updateBar(pos);
                soundSwap(pos);
                updateStats();
                await sleep(getDelay());
                S.barElements[pos].classList.remove('swapping');
                S.barElements[pos].classList.add('sorted');
            }
        }

        S.barElements[cycleStart].classList.remove('pivot');
        S.barElements[cycleStart].classList.add('sorted');
    }
    S.barElements[S.array.length - 1].classList.add('sorted');
}

// =====================================================================
//  Radix Sort (LSD)
// =====================================================================
async function radixSortLSD() {
    const n = S.array.length;
    const max = Math.max(...S.array);

    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        await _countingSortByDigit(n, exp);
    }
}

async function _countingSortByDigit(n, exp) {
    const output = new Array(n);
    const count  = new Array(10).fill(0);

    for (let i = 0; i < n; i++) {
        const digit = Math.floor(S.array[i] / exp) % 10;
        count[digit]++;
        S.accesses++;
        S.barElements[i].classList.add('comparing');
        soundSwap(i);
        await sleep(getDelay());
        S.barElements[i].classList.remove('comparing');
        updateStats();
    }

    for (let i = 1; i < 10; i++) count[i] += count[i - 1];

    for (let i = n - 1; i >= 0; i--) {
        const digit = Math.floor(S.array[i] / exp) % 10;
        output[count[digit] - 1] = S.array[i];
        count[digit]--;
        S.accesses += 2;
        S.barElements[i].classList.add('active');
        await sleep(getDelay());
        S.barElements[i].classList.remove('active');
        updateStats();
    }

    for (let i = 0; i < n; i++) {
        if (S.array[i] !== output[i]) { S.array[i] = output[i]; S.swaps++; }
        S.accesses += 2;
        updateBar(i);
        S.barElements[i].classList.add('swapping');
        soundSwap(i);
        updateStats();
        await sleep(getDelay());
        S.barElements[i].classList.remove('swapping');
    }
}

// =====================================================================
//  Bitonic Sort
// =====================================================================
async function bitonicSortWrapper() {
    const n = S.array.length;
    let p = 1;
    while (p < n) p <<= 1;

    const padCount = p - n;
    const maxVal = Math.max(...S.array);

    for (let i = 0; i < padCount; i++) {
        S.array.push(maxVal + 1 + i);
        addPaddingBar();
    }

    await _bitonicRec(0, p, true);

    for (let i = 0; i < padCount; i++) {
        removePaddingBar();
        S.array.pop();
    }

    for (let i = 0; i < n; i++) updateBar(i);
}

async function _bitonicRec(low, count, ascending) {
    if (count <= 1 || isAborted()) return;
    const half = count >> 1;
    await _bitonicRec(low, half, true);
    await _bitonicRec(low + half, half, false);
    await _bitonicMerge(low, count, ascending);
}

async function _bitonicMerge(low, count, ascending) {
    if (count <= 1 || isAborted()) return;
    const half = count >> 1;

    for (let i = low; i < low + half; i++) {
        const j = i + half;

        S.barElements[i].classList.add('comparing');
        S.barElements[j].classList.add('comparing');
        S.comparisons++;
        S.accesses += 2;
        soundCompare(i, j);
        updateStats();
        await sleep(getDelay());

        if ((ascending && S.array[i] > S.array[j]) || (!ascending && S.array[i] < S.array[j])) {
            S.barElements[i].classList.remove('comparing');
            S.barElements[j].classList.remove('comparing');
            S.barElements[i].classList.add('swapping');
            S.barElements[j].classList.add('swapping');
            [S.array[i], S.array[j]] = [S.array[j], S.array[i]];
            S.swaps++;
            S.accesses += 4;
            updateBar(i);
            updateBar(j);
            soundSwap(i);
            updateStats();
            await sleep(getDelay());
            S.barElements[i].classList.remove('swapping');
            S.barElements[j].classList.remove('swapping');
        } else {
            S.barElements[i].classList.remove('comparing');
            S.barElements[j].classList.remove('comparing');
        }
    }

    await _bitonicMerge(low, half, ascending);
    await _bitonicMerge(low + half, half, ascending);
}

// =====================================================================
//  Timsort
// =====================================================================
async function timSort() {
    const n = S.array.length;
    const MIN_RUN = Math.max(4, Math.min(32, n >> 1));

    async function timInsert(left, right) {
        for (let i = left + 1; i <= right; i++) {
            const key = S.array[i];
            S.accesses++;
            S.barElements[i].classList.add('active');
            let j = i - 1;

            while (j >= left && S.array[j] > key) {
                S.barElements[j].classList.add('comparing');
                S.comparisons++;
                S.accesses += 2;
                soundSwap(j);
                await sleep(getDelay());
                S.array[j + 1] = S.array[j];
                S.accesses += 2;
                S.swaps++;
                updateBar(j + 1);
                S.barElements[j].classList.remove('comparing');
                j--;
                updateStats();
            }
            S.array[j + 1] = key;
            S.accesses++;
            updateBar(j + 1);
            S.barElements[i].classList.remove('active');
        }
    }

    async function timMerge(left, mid, right) {
        const LA = S.array.slice(left, mid + 1);
        const RA = S.array.slice(mid + 1, right + 1);
        S.accesses += right - left + 1;
        let i = 0, j = 0, k = left;

        for (let x = left; x <= right; x++) S.barElements[x].classList.add('active');
        await sleep(getDelay());

        while (i < LA.length && j < RA.length) {
            S.comparisons++;
            S.accesses += 2;
            S.barElements[k].classList.add('comparing');
            soundSwap(k);
            await sleep(getDelay());

            if (LA[i] <= RA[j]) { S.array[k] = LA[i++]; }
            else                { S.array[k] = RA[j++]; S.swaps++; }
            S.accesses++;
            updateBar(k);
            S.barElements[k].classList.remove('comparing', 'active');
            updateStats();
            k++;
        }
        while (i < LA.length) { S.array[k] = LA[i++]; S.accesses++; updateBar(k); soundSwap(k); S.barElements[k].classList.remove('active'); k++; await sleep(getDelay()); }
        while (j < RA.length) { S.array[k] = RA[j++]; S.accesses++; updateBar(k); soundSwap(k); S.barElements[k].classList.remove('active'); k++; await sleep(getDelay()); }
        for (let x = left; x <= right; x++) S.barElements[x].classList.remove('active');
    }

    // Step 1: insertion-sort individual runs
    for (let start = 0; start < n; start += MIN_RUN) {
        await timInsert(start, Math.min(start + MIN_RUN - 1, n - 1));
    }

    // Step 2: merge runs, doubling each pass
    for (let size = MIN_RUN; size < n; size *= 2) {
        for (let left = 0; left < n; left += 2 * size) {
            const mid   = Math.min(left + size - 1, n - 1);
            const right = Math.min(left + 2 * size - 1, n - 1);
            if (mid < right) await timMerge(left, mid, right);
        }
    }
}

// =====================================================================
//  IntroSort
// =====================================================================
async function introSort() {
    const n = S.array.length;
    const maxDepth = Math.floor(2 * Math.log2(n));
    await _introRec(0, n - 1, maxDepth);
}

async function _introRec(low, high, depth) {
    if (isAborted()) return;
    const size = high - low + 1;
    if (size <= 16) { await _introInsert(low, high); return; }
    if (depth === 0) { await _introHeap(low, high); return; }

    const pivot = await _introPartition(low, high);
    await _introRec(low, pivot - 1, depth - 1);
    await _introRec(pivot + 1, high, depth - 1);
}

async function _introPartition(low, high) {
    const mid = Math.floor((low + high) / 2);
    if (S.array[low] > S.array[mid]) { [S.array[low], S.array[mid]] = [S.array[mid], S.array[low]]; updateBar(low); updateBar(mid); S.swaps++; S.accesses += 4; }
    if (S.array[low] > S.array[high]) { [S.array[low], S.array[high]] = [S.array[high], S.array[low]]; updateBar(low); updateBar(high); S.swaps++; S.accesses += 4; }
    if (S.array[mid] > S.array[high]) { [S.array[mid], S.array[high]] = [S.array[high], S.array[mid]]; updateBar(mid); updateBar(high); S.swaps++; S.accesses += 4; }
    [S.array[mid], S.array[high]] = [S.array[high], S.array[mid]];
    updateBar(mid); updateBar(high); S.swaps++; S.accesses += 4;

    const pivotVal = S.array[high];
    S.barElements[high].classList.add('pivot');
    let i = low - 1;

    for (let j = low; j < high; j++) {
        S.barElements[j].classList.add('comparing');
        S.comparisons++;
        S.accesses++;
        soundSwap(j);
        updateStats();
        await sleep(getDelay());

        if (S.array[j] < pivotVal) {
            i++;
            if (i !== j) {
                S.barElements[i].classList.add('swapping');
                S.barElements[j].classList.add('swapping');
                [S.array[i], S.array[j]] = [S.array[j], S.array[i]];
                S.swaps++; S.accesses += 4;
                updateBar(i); updateBar(j);
                soundSwap(i);
                updateStats();
                await sleep(getDelay());
                S.barElements[i].classList.remove('swapping');
            }
            S.barElements[j].classList.remove('swapping');
        }
        S.barElements[j].classList.remove('comparing');
    }
    i++;
    if (i !== high) {
        S.barElements[i].classList.add('swapping');
        [S.array[i], S.array[high]] = [S.array[high], S.array[i]];
        S.swaps++; S.accesses += 4;
        updateBar(i); updateBar(high);
        soundSwap(i);
        updateStats();
        await sleep(getDelay());
        S.barElements[i].classList.remove('swapping');
    }
    S.barElements[high].classList.remove('pivot');
    S.barElements[i].classList.add('sorted');
    return i;
}

async function _introInsert(low, high) {
    for (let i = low + 1; i <= high; i++) {
        const key = S.array[i];
        S.accesses++;
        S.barElements[i].classList.add('active');
        let j = i - 1;
        while (j >= low && S.array[j] > key) {
            S.comparisons++; S.accesses += 2;
            S.barElements[j].classList.add('comparing');
            soundSwap(j);
            await sleep(getDelay());
            S.array[j + 1] = S.array[j];
            S.swaps++; S.accesses += 2;
            updateBar(j + 1);
            S.barElements[j].classList.remove('comparing');
            j--;
            updateStats();
        }
        S.array[j + 1] = key;
        S.accesses++;
        updateBar(j + 1);
        S.barElements[i].classList.remove('active');
    }
}

async function _introHeap(low, high) {
    const n = high - low + 1;

    async function siftDown(size, root) {
        let largest = root;
        const l = 2 * (root - low) + 1 + low;
        const r = l + 1;
        if (l <= low + size - 1) {
            S.comparisons++; S.accesses += 2;
            S.barElements[l].classList.add('comparing');
            soundSwap(l);
            await sleep(getDelay());
            if (S.array[l] > S.array[largest]) largest = l;
            S.barElements[l].classList.remove('comparing');
        }
        if (r <= low + size - 1) {
            S.comparisons++; S.accesses += 2;
            S.barElements[r].classList.add('comparing');
            soundSwap(r);
            await sleep(getDelay());
            if (S.array[r] > S.array[largest]) largest = r;
            S.barElements[r].classList.remove('comparing');
        }
        updateStats();
        if (largest !== root) {
            S.barElements[root].classList.add('swapping');
            S.barElements[largest].classList.add('swapping');
            [S.array[root], S.array[largest]] = [S.array[largest], S.array[root]];
            S.swaps++; S.accesses += 4;
            updateBar(root); updateBar(largest);
            soundSwap(root);
            updateStats();
            await sleep(getDelay());
            S.barElements[root].classList.remove('swapping');
            S.barElements[largest].classList.remove('swapping');
            await siftDown(size, largest);
        }
    }

    for (let i = low + Math.floor(n / 2) - 1; i >= low; i--) await siftDown(n, i);
    for (let i = high; i > low; i--) {
        S.barElements[low].classList.add('swapping');
        S.barElements[i].classList.add('swapping');
        [S.array[low], S.array[i]] = [S.array[i], S.array[low]];
        S.swaps++; S.accesses += 4;
        updateBar(low); updateBar(i);
        soundSwap(low);
        updateStats();
        await sleep(getDelay());
        S.barElements[low].classList.remove('swapping');
        S.barElements[i].classList.remove('swapping');
        S.barElements[i].classList.add('sorted');
        await siftDown(i - low, low);
    }
    S.barElements[low].classList.add('sorted');
}

// =====================================================================
//  Flashsort
// =====================================================================
async function flashSort() {
    const n = S.array.length;
    if (n <= 1) return;

    const m = Math.max(Math.floor(0.45 * n), 2);
    let min = S.array[0], max = S.array[0], maxIdx = 0;
    S.accesses += 2;

    for (let i = 1; i < n; i++) {
        S.accesses++;
        S.barElements[i].classList.add('comparing');
        soundSwap(i);
        S.comparisons++;
        await sleep(getDelay());
        if (S.array[i] < min) min = S.array[i];
        if (S.array[i] > max) { max = S.array[i]; maxIdx = i; }
        S.barElements[i].classList.remove('comparing');
        updateStats();
    }

    if (min === max) return;

    const c1 = (m - 1) / (max - min);
    const L = new Array(m).fill(0);

    for (let i = 0; i < n; i++) { L[Math.floor(c1 * (S.array[i] - min))]++; S.accesses++; }
    for (let k = 1; k < m; k++) L[k] += L[k - 1];

    if (maxIdx !== 0) {
        S.barElements[0].classList.add('swapping');
        S.barElements[maxIdx].classList.add('swapping');
        [S.array[0], S.array[maxIdx]] = [S.array[maxIdx], S.array[0]];
        S.swaps++; S.accesses += 4;
        updateBar(0); updateBar(maxIdx);
        soundSwap(0);
        updateStats();
        await sleep(getDelay());
        S.barElements[0].classList.remove('swapping');
        S.barElements[maxIdx].classList.remove('swapping');
    }

    let move = 0, j = 0, k = m - 1, flash;
    while (move < n - 1) {
        while (j >= L[k]) {
            j++;
            if (j < n) k = Math.floor(c1 * (S.array[j] - min));
            else break;
        }
        if (j >= n) break;
        flash = S.array[j];
        S.accesses++;
        while (j < L[k]) {
            k = Math.floor(c1 * (flash - min));
            const dest = L[k] - 1;
            S.barElements[dest].classList.add('swapping');
            S.barElements[j].classList.add('active');
            const tmp = S.array[dest];
            S.array[dest] = flash;
            flash = tmp;
            S.swaps++; S.accesses += 3;
            updateBar(dest);
            soundSwap(dest);
            updateStats();
            await sleep(getDelay());
            S.barElements[dest].classList.remove('swapping');
            S.barElements[j].classList.remove('active');
            L[k]--;
            move++;
        }
    }

    // Final insertion sort pass
    for (let i = 1; i < n; i++) {
        const key = S.array[i];
        S.accesses++;
        let jj = i - 1;
        S.barElements[i].classList.add('active');

        while (jj >= 0 && S.array[jj] > key) {
            S.comparisons++; S.accesses += 2;
            S.barElements[jj].classList.add('comparing');
            soundSwap(jj);
            await sleep(getDelay());
            S.array[jj + 1] = S.array[jj];
            S.swaps++; S.accesses += 2;
            updateBar(jj + 1);
            S.barElements[jj].classList.remove('comparing');
            jj--;
            updateStats();
        }
        S.array[jj + 1] = key;
        S.accesses++;
        updateBar(jj + 1);
        S.barElements[i].classList.remove('active');
    }
}

// =====================================================================
//  Library Sort (Gapped Insertion Sort)
// =====================================================================
async function librarySort() {
    const n = S.array.length;
    const GAP = 2;
    const size = n * GAP;
    const EMPTY = -1;
    const lib = new Array(size).fill(EMPTY);

    const mid = Math.floor(size / 2);
    lib[mid] = S.array[0];
    S.accesses++;
    S.barElements[0].classList.add('active');
    soundSwap(0);
    await sleep(getDelay());
    S.barElements[0].classList.remove('active');

    for (let i = 1; i < n; i++) {
        const val = S.array[i];
        S.accesses++;
        S.barElements[i].classList.add('active');

        let lo = 0, hi = size - 1;
        while (lo <= hi) {
            const m = Math.floor((lo + hi) / 2);
            if (lib[m] === EMPTY) {
                let left = m, right = m;
                while (left >= lo && lib[left] === EMPTY) left--;
                while (right <= hi && lib[right] === EMPTY) right++;
                if (left >= lo && lib[left] !== EMPTY) { S.comparisons++; if (lib[left] <= val) lo = m + 1; else hi = m - 1; }
                else if (right <= hi && lib[right] !== EMPTY) { S.comparisons++; if (lib[right] <= val) lo = right + 1; else hi = m - 1; }
                else break;
            } else {
                S.comparisons++;
                if (lib[m] <= val) lo = m + 1; else hi = m - 1;
            }
        }
        updateStats();

        let pos = lo;
        if (pos >= size) pos = size - 1;
        if (lib[pos] !== EMPTY) {
            let left = pos, right = pos;
            while (left >= 0 && lib[left] !== EMPTY) left--;
            while (right < size && lib[right] !== EMPTY) right++;
            if (left >= 0 && (right >= size || (pos - left) <= (right - pos))) {
                for (let s = left; s < pos; s++) { lib[s] = lib[s + 1]; S.swaps++; }
                pos--;
            } else if (right < size) {
                for (let s = right; s > pos; s--) { lib[s] = lib[s - 1]; S.swaps++; }
            }
        }
        lib[pos] = val;

        let idx = 0;
        for (let g = 0; g < size && idx < n; g++) {
            if (lib[g] !== EMPTY) { S.array[idx] = lib[g]; updateBar(idx); idx++; }
        }
        while (idx < n) { S.array[idx] = 0; updateBar(idx); idx++; }

        soundSwap(Math.min(i, n - 1));
        updateStats();
        await sleep(getDelay());
        S.barElements[i].classList.remove('active');
    }

    let idx = 0;
    for (let g = 0; g < size && idx < n; g++) {
        if (lib[g] !== EMPTY) {
            S.array[idx] = lib[g];
            updateBar(idx);
            soundSwap(idx);
            S.barElements[idx].classList.add('sorted');
            idx++;
            await sleep(getDelay());
        }
    }
}

// =====================================================================
//  Stooge Sort
// =====================================================================
async function stoogeSort(lo, hi) {
    if (lo >= hi || isAborted()) return;

    S.barElements[lo].classList.add('comparing');
    S.barElements[hi].classList.add('comparing');
    S.comparisons++;
    S.accesses += 2;
    soundCompare(lo, hi);
    updateStats();
    await sleep(getDelay());

    if (S.array[lo] > S.array[hi]) {
        S.barElements[lo].classList.remove('comparing');
        S.barElements[hi].classList.remove('comparing');
        S.barElements[lo].classList.add('swapping');
        S.barElements[hi].classList.add('swapping');
        [S.array[lo], S.array[hi]] = [S.array[hi], S.array[lo]];
        S.swaps++;
        S.accesses += 4;
        updateBar(lo);
        updateBar(hi);
        soundSwap(lo);
        updateStats();
        await sleep(getDelay());
        S.barElements[lo].classList.remove('swapping');
        S.barElements[hi].classList.remove('swapping');
    } else {
        S.barElements[lo].classList.remove('comparing');
        S.barElements[hi].classList.remove('comparing');
    }

    if (hi - lo + 1 > 2) {
        const t = Math.floor((hi - lo + 1) / 3);
        await stoogeSort(lo, hi - t);
        await stoogeSort(lo + t, hi);
        await stoogeSort(lo, hi - t);
    }
}

// =====================================================================
//  Bogo Sort   (caller in main.js enforces array.length ≤ 8)
// =====================================================================
async function bogoSort() {
    async function visualCheck() {
        for (let i = 0; i < S.array.length - 1; i++) {
            S.barElements[i].classList.add('comparing');
            S.barElements[i + 1].classList.add('comparing');
            S.accesses += 2;
            S.comparisons++;
            soundCompare(i, i + 1);
            await sleep(Math.min(getDelay(), 30));
            const ok = S.array[i] <= S.array[i + 1];
            S.barElements[i].classList.remove('comparing');
            S.barElements[i + 1].classList.remove('comparing');
            if (!ok) return false;
        }
        return true;
    }

    const MAX = 500_000;
    let attempts = 0;

    while (attempts < MAX) {
        attempts++;
        updateStats();
        if (await visualCheck()) return;

        // Fisher-Yates shuffle
        for (let i = S.array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            if (i !== j) {
                S.barElements[i].classList.add('swapping');
                S.barElements[j].classList.add('swapping');
                [S.array[i], S.array[j]] = [S.array[j], S.array[i]];
                S.swaps++;
                S.accesses += 4;
                updateBar(i);
                updateBar(j);
                soundSwap(i);
                await sleep(Math.min(getDelay(), 15));
                S.barElements[i].classList.remove('swapping');
                S.barElements[j].classList.remove('swapping');
            }
        }
        updateStats();
    }
}

// =====================================================================
//  Sleep Sort   (timer IDs tracked & cleared on abort)
// =====================================================================
async function sleepSort() {
    const n = S.array.length;
    const maxVal = Math.max(...S.array);
    const result = [];
    let resolved = 0;

    for (let i = 0; i < n; i++) S.barElements[i].classList.add('active');
    await sleep(getDelay());

    return new Promise((resolve, reject) => {
        const baseDelay = Math.max(20, getDelay() * 2);
        const timerIds  = [];
        const signal    = S.abortCtrl?.signal;

        // Abort handler: clear ALL pending timers, reject promise
        const onAbort = () => {
            timerIds.forEach(id => clearTimeout(id));
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });

        for (let i = 0; i < n; i++) {
            const val = S.array[i];
            const delay = (val / maxVal) * baseDelay * n;
            S.accesses++;

            const id = setTimeout(() => {
                result.push(val);
                const idx = result.length - 1;
                S.array[idx] = val;
                updateBar(idx);
                S.barElements[idx].classList.remove('active', 'comparing');
                S.barElements[idx].classList.add('sorted');
                soundSwap(idx);
                S.swaps++;
                updateStats();

                resolved++;
                if (resolved === n) {
                    signal?.removeEventListener('abort', onAbort);
                    resolve();
                }
            }, delay);
            timerIds.push(id);
        }
    });
}

// =====================================================================
//  Dispatcher  (exported for main.js)
// =====================================================================
export const algorithms = {
    bubble:    bubbleSort,
    selection: selectionSort,
    insertion: insertionSort,
    quick:     () => quickSort(0, S.array.length - 1),
    merge:     () => mergeSort(0, S.array.length - 1),
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
    stooge:    () => stoogeSort(0, S.array.length - 1),
    bogo:      bogoSort,
    sleep:     sleepSort,
};
