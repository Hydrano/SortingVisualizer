# 🎯 Sorting Algorithm Visualizer

An interactive web-based tool that visualizes how different sorting algorithms work. Watch algorithms sort data in real-time with animated bars, sound effects, and detailed statistics.

**🔗 Live Demo:** [https://hydrano.github.io/SortingVisualizer/](https://hydrano.github.io/SortingVisualizer/)

![Sorting Visualizer](https://img.shields.io/badge/Algorithms-22-blue) ![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **22 Sorting Algorithms** — From classic Bubble Sort to exotic Bogo Sort
- **GPU-Accelerated Rendering** — Bars use CSS `transform: scaleY()` instead of `height` (no reflow)
- **Real-time Animation** — Bars visually rearrange as the algorithm runs
- **Sound Effects** — Oscillator pool with throttling (max 20 tones/sec, no GC pressure)
- **Live Statistics** — Comparisons, swaps, array accesses, and elapsed time (`requestAnimationFrame`-synced)
- **Adjustable Controls** — Change array size (5–100), animation speed, and volume
- **Color-coded States** — Yellow (comparing), Red (swapping), Orange (pivot), Green (sorted)
- **ES Module Architecture** — Clean split: `state.js`, `audio.js`, `ui.js`, `algorithms.js`, `main.js`
- **AbortController** — Native cancellation via `AbortController` + rejecting `sleep()` — no manual stop-flag polling
- **Dark Theme** — Easy on the eyes, inspired by YouTube Shorts visualizations

---

## 🧮 Supported Algorithms

| Algorithm | Time (Avg) | Time (Worst) | Space |
|-----------|------------|--------------|-------|
| Bubble Sort | O(n²) | O(n²) | O(1) |
| Selection Sort | O(n²) | O(n²) | O(1) |
| Insertion Sort | O(n²) | O(n²) | O(1) |
| Quick Sort | O(n log n) | O(n²) | O(log n) |
| Merge Sort | O(n log n) | O(n log n) | O(n) |
| Heap Sort | O(n log n) | O(n log n) | O(1) |
| Shell Sort | O(n log² n) | O(n²) | O(1) |
| Cocktail Shaker Sort | O(n²) | O(n²) | O(1) |
| Comb Sort | O(n²/2ᵖ) | O(n²) | O(1) |
| Gnome Sort | O(n²) | O(n²) | O(1) |
| Odd-Even Sort | O(n²) | O(n²) | O(1) |
| Pancake Sort | O(n²) | O(n²) | O(1) |
| Cycle Sort | O(n²) | O(n²) | O(1) |
| Radix Sort (LSD) | O(nk) | O(nk) | O(n+k) |
| Bitonic Sort | O(n log² n) | O(n log² n) | O(1) |
| Timsort | O(n log n) | O(n log n) | O(n) |
| IntroSort | O(n log n) | O(n log n) | O(log n) |
| Flashsort | O(n) | O(n²) | O(n) |
| Library Sort | O(n log n) | O(n²) | O(n) |
| Stooge Sort | O(n^2.71) | O(n^2.71) | O(log n) |
| Bogo Sort | O((n+1)!) | O(∞) | O(1) |
| Sleep Sort | O(n + max) | O(n + max) | O(n) |

---

## 🚀 How to Use

### Online (Recommended)
Simply visit the live demo: **[hydrano.github.io/SortingVisualizer](https://hydrano.github.io/SortingVisualizer/)**

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Hydrano/SortingVisualizer.git
   cd SortingVisualizer
   ```

2. **Serve via any HTTP server** (required for ES modules)
   ```bash
   python -m http.server 8080
   ```
   Then open `http://localhost:8080`

   > **Note:** Opening `index.html` as a `file://` URL will not work because browsers block ES module imports from the local filesystem. Any HTTP server works.

3. **Or run with Flask** (optional, for development)
   ```bash
   pip install flask
   python app.py
   ```
   Then visit `http://localhost:5050`

---

## 🎮 Controls

| Control | Description |
|---------|-------------|
| **Algorithm** | Select which sorting algorithm to visualize |
| **Bars** | Adjust the number of elements (5–100) |
| **Speed** | Control animation speed (1 = slow, 100 = fast) |
| **Sound** | Toggle mute and adjust volume |
| **Shuffle** | Generate a new random array |
| **Sort** | Start the sorting animation |
| **Stop** | Halt the current sort |

---

## 🎨 Color Legend

| Color | Meaning |
|-------|---------|
| 🟦 Blue | Unsorted element |
| 🟨 Yellow | Being compared |
| 🟥 Red | Being swapped |
| 🟧 Orange | Pivot element |
| 🟩 Green | Sorted / in final position |

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (ES Modules)
- **Architecture:** `state.js` → `audio.js` → `ui.js` → `algorithms.js` → `main.js`
- **Rendering:** CSS `transform: scaleY()` — GPU-composited, zero layout reflow
- **Audio:** Web Audio API — fixed oscillator pool (4 voices, round-robin) with 20 Hz throttle
- **Cancellation:** `AbortController` + rejecting `sleep()` — single `try/catch` in entry point
- **Timer:** `requestAnimationFrame` — synced to monitor refresh rate
- **Backend:** Flask (optional, for local development)
- **Hosting:** GitHub Pages

---

## ⚠️ Algorithm Notes

| Algorithm | Note |
|-----------|------|
| **Bogo Sort** | Auto-capped at 8 elements to prevent browser freeze |
| **Sleep Sort** | Timer IDs are tracked and cleared on abort (no memory leaks) |
| **Stooge Sort** | O(n^2.71) — extremely slow for large arrays, use ≤ 15 elements |
| **Bitonic Sort** | Array is padded to the next power of 2 with dim sentinel bars |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Inspired by the sorting algorithm visualizations seen on YouTube Shorts and various educational programming content.

---

Made with ❤️ by [Hydrano](https://github.com/Hydrano)
