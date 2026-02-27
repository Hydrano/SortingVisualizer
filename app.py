"""
Sorting Algorithm Visualizer - Flask Web Application
Visualize how different sorting algorithms work with animated bar charts.
"""

from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    """Serve the main visualizer page."""
    algorithms = [
        {
            "id": "bubble",
            "name": "Bubble Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.",
        },
        {
            "id": "selection",
            "name": "Selection Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Finds the minimum element from the unsorted part and puts it at the beginning.",
        },
        {
            "id": "insertion",
            "name": "Insertion Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Builds the sorted array one item at a time by inserting each element into its correct position.",
        },
        {
            "id": "quick",
            "name": "Quick Sort",
            "time_avg": "O(n log n)",
            "time_worst": "O(n²)",
            "space": "O(log n)",
            "description": "Picks a 'pivot' and partitions the array: elements smaller than pivot go left, larger go right.",
        },
        {
            "id": "merge",
            "name": "Merge Sort",
            "time_avg": "O(n log n)",
            "time_worst": "O(n log n)",
            "space": "O(n)",
            "description": "Divides the array into halves, recursively sorts them, then merges the sorted halves.",
        },
        {
            "id": "heap",
            "name": "Heap Sort",
            "time_avg": "O(n log n)",
            "time_worst": "O(n log n)",
            "space": "O(1)",
            "description": "Builds a max heap, then repeatedly extracts the maximum element to build the sorted array.",
        },
        {
            "id": "shell",
            "name": "Shell Sort",
            "time_avg": "O(n log² n)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Generalization of insertion sort that allows exchange of far-apart elements using gap sequences.",
        },
        {
            "id": "cocktail",
            "name": "Cocktail Shaker Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Variation of bubble sort that traverses the array in both directions alternately.",
        },
        {
            "id": "comb",
            "name": "Comb Sort",
            "time_avg": "O(n² / 2ᵖ)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Improves bubble sort by comparing elements far apart using a shrinking gap factor of ~1.3, eliminating small values at the end.",
        },
        {
            "id": "gnome",
            "name": "Gnome Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Works like a garden gnome sorting flower pots: moves forward when in order, swaps and steps back when not.",
        },
        {
            "id": "oddeven",
            "name": "Odd-Even Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Parallel-friendly variant of bubble sort that alternates between comparing odd-even and even-odd indexed pairs.",
        },
        {
            "id": "pancake",
            "name": "Pancake Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Only uses 'flip' operations (reverse a prefix). Finds the max, flips it to top, then flips it to its correct position.",
        },
        {
            "id": "cycle",
            "name": "Cycle Sort",
            "time_avg": "O(n²)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Minimizes the number of writes to memory. Rotates each element to its correct position in cycles.",
        },
        {
            "id": "radix",
            "name": "Radix Sort (LSD)",
            "time_avg": "O(nk)",
            "time_worst": "O(nk)",
            "space": "O(n + k)",
            "description": "Non-comparison sort. Distributes elements into buckets by each digit (least significant first), then collects them.",
        },
        {
            "id": "bitonic",
            "name": "Bitonic Sort",
            "time_avg": "O(n log² n)",
            "time_worst": "O(n log² n)",
            "space": "O(1)",
            "description": "Sorting network that first builds bitonic sequences, then merges them. Designed for parallel hardware (GPU sorting).",
        },
        {
            "id": "tim",
            "name": "Timsort",
            "time_avg": "O(n log n)",
            "time_worst": "O(n log n)",
            "space": "O(n)",
            "description": "Python and Java's default sort. Hybrid of merge sort and insertion sort — finds natural runs and merges them. Nearly unbeatable on real-world data.",
        },
        {
            "id": "intro",
            "name": "IntroSort",
            "time_avg": "O(n log n)",
            "time_worst": "O(n log n)",
            "space": "O(log n)",
            "description": "C++ STL's std::sort. Starts with Quick Sort, switches to Heap Sort if recursion goes too deep, and uses Insertion Sort for small partitions.",
        },
        {
            "id": "flash",
            "name": "Flashsort",
            "time_avg": "O(n)",
            "time_worst": "O(n²)",
            "space": "O(1)",
            "description": "Distribution sort that estimates where each element belongs based on its value distribution. Linear time on uniform data.",
        },
        {
            "id": "library",
            "name": "Library Sort",
            "time_avg": "O(n log n)",
            "time_worst": "O(n²)",
            "space": "O(n)",
            "description": "Like insertion sort with gaps (like a bookshelf). Leaves empty spaces so elements can be inserted without shifting everything.",
        },
        {
            "id": "stooge",
            "name": "Stooge Sort",
            "time_avg": "O(n^2.71)",
            "time_worst": "O(n^2.71)",
            "space": "O(n)",
            "description": "Recursively sorts first ⅔, last ⅔, then first ⅔ again. Slower than bubble sort — a mathematical curiosity.",
        },
        {
            "id": "bogo",
            "name": "Bogo Sort",
            "time_avg": "O((n+1)!)",
            "time_worst": "O(∞)",
            "space": "O(1)",
            "description": "The 'hope algorithm'. Randomly shuffles the array and checks if it's sorted. Repeats until sorted — or the heat death of the universe.",
        },
        {
            "id": "sleep",
            "name": "Sleep Sort",
            "time_avg": "O(n + max)",
            "time_worst": "O(n + max)",
            "space": "O(n)",
            "description": "Each element 'sleeps' for a time proportional to its value, then wakes up in order. Uses setTimeout to simulate threads. A joke that actually works.",
        },
    ]
    return render_template("index.html", algorithms=algorithms)


if __name__ == "__main__":
    app.run(debug=True, port=5050)
