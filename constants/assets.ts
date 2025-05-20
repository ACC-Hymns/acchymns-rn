export const noteSvgs = {
    A2: require('../assets/icons/note_icons/A2.svg'),
    A3: require('../assets/icons/note_icons/A3.svg'),
    B2: require('../assets/icons/note_icons/B2.svg'),
    B3: require('../assets/icons/note_icons/B3.svg'),
    C3: require('../assets/icons/note_icons/C3.svg'),
    C4: require('../assets/icons/note_icons/C4.svg'),
    D3: require('../assets/icons/note_icons/D3.svg'),
    E3: require('../assets/icons/note_icons/E3.svg'),
    F2: require('../assets/icons/note_icons/F2.svg'),
    F3: require('../assets/icons/note_icons/F3.svg'),
    G2: require('../assets/icons/note_icons/G2.svg'),
    G3: require('../assets/icons/note_icons/G3.svg'),
} as const;
  
export const trebleNoteSvgs = {
    A3: require('../assets/icons/note_icons/treble/A3.svg'),
    A4: require('../assets/icons/note_icons/treble/A4.svg'),
    A5: require('../assets/icons/note_icons/treble/A5.svg'),
    B3: require('../assets/icons/note_icons/treble/B3.svg'),
    B4: require('../assets/icons/note_icons/treble/B4.svg'),
    B5: require('../assets/icons/note_icons/treble/B5.svg'),
    C4: require('../assets/icons/note_icons/treble/C4.svg'),
    C5: require('../assets/icons/note_icons/treble/C5.svg'),
    C6: require('../assets/icons/note_icons/treble/C6.svg'),
    D4: require('../assets/icons/note_icons/treble/D4.svg'),
    D5: require('../assets/icons/note_icons/treble/D5.svg'),
    E4: require('../assets/icons/note_icons/treble/E4.svg'),
    E5: require('../assets/icons/note_icons/treble/E5.svg'),
    F4: require('../assets/icons/note_icons/treble/F4.svg'),
    F5: require('../assets/icons/note_icons/treble/F5.svg'),
    G4: require('../assets/icons/note_icons/treble/G4.svg'),
    G5: require('../assets/icons/note_icons/treble/G5.svg'),
} as const;

type Clef = 'bass' | 'treble';
type Note = keyof typeof noteSvgs | keyof typeof trebleNoteSvgs;

export const getNoteSvg = (note: Note, clef: Clef = 'bass') => {
    if (clef === 'treble') {
        return trebleNoteSvgs[note as keyof typeof trebleNoteSvgs];
    }
    return noteSvgs[note as keyof typeof noteSvgs];
};

export type { Clef, Note };