type KeypadGridOptions = {
    itemSize: number;
    itemMargin?: number;
    horizontalPadding?: number;
    maxColumns?: number;
};

export function getKeypadColumns(
    screenWidth: number,
    { itemSize, itemMargin = 6, horizontalPadding = 30, maxColumns }: KeypadGridOptions,
): number {
    const itemTotalWidth = itemSize + itemMargin * 2;
    const availableWidth = screenWidth - horizontalPadding;
    const calculatedColumns = Math.max(1, Math.floor(availableWidth / itemTotalWidth));
    return maxColumns != null ? Math.min(maxColumns, calculatedColumns) : calculatedColumns;
}

export function getKeypadGridWidth(
    numColumns: number,
    itemSize: number,
    itemMargin = 6,
): number {
    return numColumns * (itemSize + itemMargin * 2);
}
