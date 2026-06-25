export type BroadcastTarget = 'aws' | 'hymnsign' | 'both';

export const DEFAULT_BROADCAST_TARGET: BroadcastTarget = 'aws';
export const DEFAULT_HYMNSIGN_PORT = 81;
export const HYMNSIGN_VERSE_COUNT = 20;
export const HYMNSIGN_CONNECTION_TIMEOUT_MS = 3000;

export type DisplayCommand =
    | {
          action: 'song';
          number: string;
          hymnal: string;
          verses: number[];
          bookColor: string;
      }
    | {
          action: 'bible';
          book: string;
          reference: string;
      }
    | {
          action: 'clear';
          clearHymnal?: boolean;
      };
