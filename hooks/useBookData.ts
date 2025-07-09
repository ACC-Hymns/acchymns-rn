import { HymnalContextType } from "@/constants/context";
import { BookSummary } from "@/constants/types";

export function useBookData(id: string, context: HymnalContextType | undefined): BookSummary | undefined {
    if(!context)
        return undefined;

    return context.BOOK_DATA[id];
}
