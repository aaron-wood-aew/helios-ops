
/**
 * Ensures a time-series dataset has a data point for every minute in the given range.
 * This is critical for Recharts 'syncId' to work correctly across multiple charts.
 * If data is missing for a minute, it inserts a point with null values or the previous value.
 */
export function ensureContinuousData<T extends { time: number }>(
    data: T[],
    start: number,
    end: number,
    intervalMs: number = 60000,
    fillMode: 'null' | 'hold' = 'null'
): T[] {
    if (data.length === 0) return [];

    // Normalize start/end to interval boundaries
    const startTick = Math.floor(start / intervalMs) * intervalMs;
    const endTick = Math.ceil(end / intervalMs) * intervalMs;

    const filled: T[] = [];
    let dataIdx = 0;

    // Create a map for fast lookup of existing data
    const dataMap = new Map<number, T>();
    data.forEach(d => {
        // Round raw data time to ensure it hits the grid
        const rounded = Math.round(d.time / intervalMs) * intervalMs;
        dataMap.set(rounded, d);
    });

    let previousVal: T | null = null;

    for (let t = startTick; t <= endTick; t += intervalMs) {
        if (dataMap.has(t)) {
            const val = dataMap.get(t)!;
            filled.push(val);
            previousVal = val;
        } else {
            // Missing data point
            if (fillMode === 'hold' && previousVal) {
                // Zero-Order Hold (repeat previous) - Good for Kp Index
                filled.push({ ...previousVal, time: t });
            } else {
                // Null fill - Good for continuous sensors (Solar Wind)
                // We need to construct a "null" object matching type T.
                // Since we don't know the keys of T, we can't easily make a null object 
                // without passing a factory or example.
                // Hack: We return an object with just { time: t } and let the chart handle missing keys as null/undefined.
                // This usually works for Recharts 'connectNulls'.
                filled.push({ time: t } as unknown as T);
            }
        }
    }

    return filled;
}
