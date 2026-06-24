import { BIBLE_BOOKS, BibleBook } from '@/constants/bible';
import { getKeypadColumns } from '@/scripts/keypadGrid';

export const SCRIPTURE_PICKER_HORIZONTAL_PADDING = 40;
export const SCRIPTURE_PICKER_TILE_MARGIN = 5;
export const SCRIPTURE_PICKER_BOOK_TILE_MIN_WIDTH = 100;
export const SCRIPTURE_PICKER_CHAPTER_TILE_MIN_SIZE = 52;
export const OLD_TESTAMENT_COUNT = 39;
export const OLD_TESTAMENT_BOOKS = BIBLE_BOOKS.slice(0, OLD_TESTAMENT_COUNT);
export const NEW_TESTAMENT_BOOKS = BIBLE_BOOKS.slice(OLD_TESTAMENT_COUNT);

export function findBookByName(name: string): BibleBook | undefined {
    return BIBLE_BOOKS.find((book) => book.name === name);
}

export function getBookColumns(screenWidth: number) {
    return getKeypadColumns(screenWidth, {
        itemSize: SCRIPTURE_PICKER_BOOK_TILE_MIN_WIDTH,
        itemMargin: SCRIPTURE_PICKER_TILE_MARGIN,
        horizontalPadding: SCRIPTURE_PICKER_HORIZONTAL_PADDING,
    });
}

export function getChapterColumns(screenWidth: number) {
    return getKeypadColumns(screenWidth, {
        itemSize: SCRIPTURE_PICKER_CHAPTER_TILE_MIN_SIZE,
        itemMargin: SCRIPTURE_PICKER_TILE_MARGIN,
        horizontalPadding: SCRIPTURE_PICKER_HORIZONTAL_PADDING,
    });
}

export function getTileWidth(screenWidth: number, numColumns: number) {
    const availableWidth = screenWidth - SCRIPTURE_PICKER_HORIZONTAL_PADDING;
    return (availableWidth - numColumns * SCRIPTURE_PICKER_TILE_MARGIN * 2) / numColumns;
}

export function chunkIntoRows<T>(items: T[], columns: number): T[][] {
    const rows: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
        rows.push(items.slice(i, i + columns));
    }
    return rows;
}
