/**
 * Shared application state for the Sorting Visualizer.
 * All modules import from here to access/mutate state.
 */

export const S = {
    array: [],
    barElements: [],
    sorting: false,
    comparisons: 0,
    swaps: 0,
    accesses: 0,
    startTs: 0,
    abortCtrl: null,
};

/** Check whether the current sort has been aborted. */
export function isAborted() {
    return S.abortCtrl?.signal?.aborted ?? false;
}
