// The 100 "legend" profile pictures members can pick from: drawn football
// characters that evoke the game's eras and roles — the curly No. 10, the
// mullet libero, the headband winger, the bald keeper — in classic kit
// colours. Deliberately no real names or faces (image rights). The id is
// what profiles.avatar stores ('legend-01' … 'legend-99', 'legend-100').

export type Hair = 'short' | 'buzz' | 'curls' | 'afro' | 'long' | 'mullet' | 'ponytail' | 'bun' | 'bald' | 'mohawk' | 'dreads' | 'sidepart' | 'quiff' | 'curtains' | 'spiky' | 'cornrows';
export type Face = 'none' | 'moustache' | 'beard' | 'stubble' | 'goatee' | 'fullbeard';
export type Pattern = 'plain' | 'stripes' | 'hoops' | 'halves' | 'sash' | 'pinstripes' | 'chest' | 'quarters' | 'checks';

export interface Legend {
  id: string;
  skin: string;
  hair: Hair;
  hairColor: string;
  face: Face;
  kit: string;
  trim: string;
  pattern: Pattern;
  num: string;
  bg: string;
  headband?: string;
  glasses?: boolean;
}

const SKIN = ['#F6D3B3', '#EAC09A', '#D9A577', '#B97E52', '#8D5A3B', '#5E3A26'] as const;
const HAIR = { black: '#1E1A18', dark: '#3B2618', brown: '#6B4423', blond: '#E2B85C', red: '#A9472A', grey: '#B9B6B0', bleach: '#F1E6C8' } as const;

type Row = [skin: number, hair: Hair, color: keyof typeof HAIR, face: Face, kit: string, trim: string, pattern: Pattern, num: string, bg: string, headband?: string, glasses?: 'glasses'];

// prettier-ignore
const ROWS: Row[] = [
  [3, 'curls', 'black', 'none', '#7DB6E8', '#FFFFFF', 'plain', '10', '#E3F0FB'],
  [1, 'mullet', 'blond', 'moustache', '#FFFFFF', '#1D1D1F', 'plain', '5', '#ECECEC'],
  [4, 'afro', 'black', 'none', '#F4D23C', '#1C8A3E', 'plain', '10', '#FFF6CC'],
  [0, 'long', 'blond', 'none', '#F07D1C', '#FFFFFF', 'plain', '14', '#FFE6D1'],
  [2, 'bald', 'black', 'none', '#2E9E4A', '#F4D23C', 'plain', '9', '#DDF3E3'],
  [1, 'ponytail', 'dark', 'none', '#1D1D1F', '#FFFFFF', 'stripes', '10', '#E8E8ED'],
  [5, 'dreads', 'black', 'goatee', '#D7262E', '#FFFFFF', 'plain', '7', '#FDE1E2'],
  [0, 'sidepart', 'red', 'none', '#00843D', '#FFFFFF', 'hoops', '8', '#DDF0E5'],
  [2, 'buzz', 'black', 'stubble', '#1F3E8A', '#FFFFFF', 'plain', '4', '#E1E8F7'],
  [1, 'quiff', 'dark', 'none', '#FFFFFF', '#C8102E', 'sash', '11', '#F6F6F6'],
  [3, 'short', 'black', 'moustache', '#6CABDD', '#1D1D1F', 'stripes', '6', '#E3EFFA'],
  [0, 'bald', 'black', 'beard', '#ED2C8B', '#1D1D1F', 'plain', '1', '#FCE1EE'],
  [4, 'mohawk', 'black', 'none', '#FFD200', '#1D1D1F', 'plain', '11', '#FFF6CC'],
  [2, 'curls', 'dark', 'beard', '#A50044', '#004D98', 'stripes', '8', '#F4DDE6'],
  [1, 'long', 'brown', 'beard', '#003DA5', '#FFFFFF', 'plain', '9', '#DEE6F6', '#FFFFFF'],
  [5, 'bald', 'black', 'none', '#FFFFFF', '#1D1D1F', 'chest', '3', '#F2F2F2'],
  [0, 'mullet', 'red', 'moustache', '#C8102E', '#FFFFFF', 'plain', '2', '#FBE0E4'],
  [3, 'sidepart', 'black', 'none', '#1D1D1F', '#C8102E', 'stripes', '3', '#ECE3E4'],
  [2, 'ponytail', 'black', 'none', '#FFFFFF', '#6A1B9A', 'plain', '10', '#EFE6F5', '#6A1B9A'],
  [4, 'buzz', 'black', 'goatee', '#1D1D1F', '#3B74C8', 'stripes', '9', '#E2E8F4'],
  [1, 'curls', 'blond', 'none', '#7A263A', '#9BC4E2', 'plain', '7', '#F3E1E5'],
  [0, 'short', 'grey', 'none', '#0A3D91', '#FFFFFF', 'chest', '6', '#DFE6F4'],
  [5, 'afro', 'black', 'moustache', '#F28C28', '#1D1D1F', 'plain', '18', '#FFE9D4'],
  [2, 'quiff', 'black', 'stubble', '#FFFFFF', '#0B6E4F', 'halves', '23', '#E3F2EC'],
  [1, 'bun', 'dark', 'beard', '#1B458F', '#FFFFFF', 'stripes', '5', '#E0E7F4'],
  [3, 'long', 'black', 'none', '#B5121B', '#F4D23C', 'plain', '7', '#F9E0E1', '#F4D23C'],
  [0, 'bald', 'black', 'stubble', '#1D1D1F', '#4AFF8B', 'plain', '1', '#E2FBEA'],
  [4, 'dreads', 'dark', 'none', '#F4D23C', '#003DA5', 'hoops', '11', '#FFF6CC'],
  [2, 'sidepart', 'dark', 'moustache', '#EF3340', '#FFFFFF', 'pinstripes', '4', '#FDE3E5'],
  [1, 'short', 'red', 'none', '#00A651', '#FFFFFF', 'halves', '17', '#DCF2E5'],
  [5, 'buzz', 'black', 'beard', '#FFFFFF', '#00843D', 'sash', '8', '#E6F3EA'],
  [0, 'curls', 'brown', 'stubble', '#003087', '#C8102E', 'halves', '19', '#E1E6F2'],
  [3, 'mohawk', 'dark', 'none', '#E4002B', '#1D1D1F', 'stripes', '21', '#FBE0E5'],
  [2, 'afro', 'dark', 'beard', '#FFFFFF', '#F28C28', 'chest', '15', '#FFF1E3'],
  [1, 'mullet', 'dark', 'none', '#00529F', '#F4D23C', 'plain', '20', '#E0E9F5'],
  [4, 'short', 'black', 'none', '#9BC4E2', '#7A263A', 'chest', '22', '#E6F0F8'],
  [0, 'ponytail', 'blond', 'none', '#00843D', '#F4D23C', 'plain', '10', '#E0F2E6', '#FFFFFF'],
  [2, 'bald', 'black', 'goatee', '#FF6F00', '#1D1D1F', 'plain', '13', '#FFE8D1'],
  [5, 'curls', 'black', 'none', '#FFD200', '#00843D', 'chest', '12', '#FFF6CC'],
  [1, 'quiff', 'blond', 'none', '#C8102E', '#1D1D1F', 'halves', '16', '#F8E0E3'],
  [3, 'dreads', 'black', 'beard', '#1D1D1F', '#F4D23C', 'hoops', '24', '#F1EEDF'],
  [0, 'sidepart', 'blond', 'none', '#FFFFFF', '#0A3D91', 'pinstripes', '6', '#EAEFF8'],
  [4, 'bun', 'black', 'none', '#6A1B9A', '#FFFFFF', 'plain', '25', '#EFE4F5'],
  [2, 'long', 'dark', 'goatee', '#1D1D1F', '#FFFFFF', 'pinstripes', '27', '#EBEBEF', '#C8102E'],
  [1, 'buzz', 'brown', 'none', '#87CEEB', '#FFFFFF', 'stripes', '2', '#E6F4FA'],
  [5, 'mohawk', 'bleach', 'none', '#00A859', '#FFFFFF', 'plain', '30', '#DDF4E8'],
  [0, 'short', 'dark', 'moustache', '#FFFFFF', '#1D1D1F', 'hoops', '33', '#F0F0F0'],
  [3, 'bald', 'black', 'none', '#C8102E', '#FFFFFF', 'chest', '99', '#FAE1E4'],
  [2, 'curls', 'red', 'none', '#4AFF8B', '#1D1D1F', 'plain', '26', '#E2FBEA'],
  [4, 'quiff', 'bleach', 'stubble', '#1D1D1F', '#4AFF8B', 'stripes', '50', '#E3F7EA'],
  // 51–100
  [1, 'curtains', 'brown', 'none', '#FFFFFF', '#003DA5', 'plain', '7', '#E4EBF7'],
  [3, 'spiky', 'black', 'none', '#FFD200', '#003DA5', 'plain', '9', '#FFF6CC'],
  [5, 'cornrows', 'black', 'none', '#C8102E', '#FFFFFF', 'quarters', '10', '#FBE1E4'],
  [0, 'curtains', 'blond', 'none', '#00843D', '#FFFFFF', 'plain', '11', '#DFF2E6'],
  [2, 'bald', 'black', 'fullbeard', '#1D1D1F', '#C8102E', 'plain', '4', '#EFE3E4'],
  [4, 'spiky', 'bleach', 'none', '#FF6F00', '#FFFFFF', 'plain', '17', '#FFE8D1'],
  [1, 'short', 'dark', 'none', '#FFFFFF', '#C8102E', 'checks', '5', '#FBE7E9'],
  [3, 'cornrows', 'dark', 'goatee', '#003087', '#FFFFFF', 'stripes', '8', '#E1E7F3'],
  [0, 'long', 'red', 'fullbeard', '#00843D', '#F4D23C', 'hoops', '6', '#E3F3E8', '#FFFFFF'],
  [2, 'curls', 'black', 'none', '#FFFFFF', '#1D1D1F', 'plain', '1', '#EDEDF0', undefined, 'glasses'],
  [5, 'spiky', 'black', 'stubble', '#6CABDD', '#FFFFFF', 'plain', '19', '#E3EFFA'],
  [1, 'bun', 'brown', 'none', '#C8102E', '#FFFFFF', 'quarters', '23', '#FBE1E4'],
  [4, 'curtains', 'black', 'none', '#7A263A', '#9BC4E2', 'stripes', '14', '#F3E1E5'],
  [0, 'bald', 'black', 'moustache', '#FFFFFF', '#00843D', 'quarters', '3', '#E6F3EA'],
  [3, 'afro', 'brown', 'none', '#F4D23C', '#00843D', 'checks', '21', '#FFF6CC'],
  [2, 'mohawk', 'red', 'none', '#1D1D1F', '#FFFFFF', 'plain', '18', '#ECECEF'],
  [1, 'sidepart', 'grey', 'none', '#003DA5', '#FFFFFF', 'chest', '2', '#E0E7F6', undefined, 'glasses'],
  [5, 'short', 'black', 'fullbeard', '#00A651', '#FFFFFF', 'stripes', '15', '#DCF2E5'],
  [0, 'ponytail', 'red', 'none', '#FFFFFF', '#C8102E', 'chest', '10', '#FBE6E8'],
  [3, 'quiff', 'dark', 'none', '#E4002B', '#FFD200', 'plain', '7', '#FDE3E6'],
  [2, 'cornrows', 'black', 'none', '#00529F', '#FFFFFF', 'halves', '20', '#E0E9F5'],
  [4, 'bald', 'black', 'goatee', '#F4D23C', '#1D1D1F', 'pinstripes', '6', '#FFF6CC'],
  [1, 'spiky', 'blond', 'none', '#1D1D1F', '#FF6F00', 'plain', '24', '#F2ECE6'],
  [0, 'curls', 'red', 'beard', '#003087', '#C8102E', 'checks', '16', '#E3E7F2'],
  [5, 'dreads', 'black', 'none', '#87CEEB', '#1D1D1F', 'plain', '11', '#E6F4FA', '#1D1D1F'],
  [2, 'curtains', 'dark', 'stubble', '#6A1B9A', '#F4D23C', 'plain', '8', '#EFE4F5'],
  [3, 'buzz', 'black', 'none', '#FFFFFF', '#E4002B', 'sash', '22', '#FCE6E9'],
  [1, 'long', 'black', 'none', '#F28C28', '#1D1D1F', 'stripes', '9', '#FFE9D4', '#1D1D1F'],
  [4, 'quiff', 'black', 'beard', '#C8102E', '#1D1D1F', 'hoops', '5', '#F8E0E3'],
  [0, 'mullet', 'brown', 'none', '#00843D', '#FFFFFF', 'chest', '13', '#DFF2E6'],
  [5, 'afro', 'black', 'stubble', '#FFFFFF', '#00843D', 'plain', '12', '#E6F3EA', '#00843D'],
  [2, 'spiky', 'dark', 'none', '#003DA5', '#F4D23C', 'quarters', '27', '#E0E7F6'],
  [1, 'bald', 'black', 'none', '#1D1D1F', '#4AFF8B', 'checks', '30', '#E3F7EA', undefined, 'glasses'],
  [3, 'curtains', 'brown', 'goatee', '#ED2C8B', '#1D1D1F', 'plain', '1', '#FCE1EE'],
  [0, 'sidepart', 'blond', 'moustache', '#C8102E', '#FFFFFF', 'pinstripes', '4', '#FBE0E4'],
  [4, 'cornrows', 'black', 'beard', '#FFD200', '#1D1D1F', 'stripes', '28', '#FFF6CC'],
  [2, 'short', 'brown', 'none', '#7DB6E8', '#FFFFFF', 'hoops', '3', '#E3F0FB'],
  [5, 'mohawk', 'black', 'goatee', '#C8102E', '#FFD200', 'sash', '29', '#FBE1E4'],
  [1, 'curls', 'blond', 'stubble', '#1D1D1F', '#FFFFFF', 'quarters', '31', '#ECECEF'],
  [0, 'quiff', 'red', 'none', '#00A859', '#FFFFFF', 'checks', '32', '#DDF4E8'],
  [3, 'long', 'dark', 'fullbeard', '#FFFFFF', '#003087', 'plain', '9', '#E9EDF6', '#003087'],
  [2, 'bun', 'black', 'none', '#00843D', '#F4D23C', 'stripes', '10', '#E0F2E6'],
  [4, 'buzz', 'dark', 'moustache', '#FF6F00', '#003DA5', 'halves', '35', '#FFE8D1'],
  [1, 'spiky', 'red', 'none', '#FFFFFF', '#6A1B9A', 'sash', '36', '#EFE6F5'],
  [5, 'curtains', 'black', 'none', '#003DA5', '#C8102E', 'checks', '37', '#E0E7F6'],
  [0, 'afro', 'red', 'none', '#7A263A', '#FFFFFF', 'plain', '38', '#F3E1E5', undefined, 'glasses'],
  [2, 'cornrows', 'dark', 'stubble', '#1D1D1F', '#FFD200', 'chest', '40', '#F1EEDF'],
  [3, 'ponytail', 'black', 'none', '#E4002B', '#FFFFFF', 'stripes', '44', '#FDE3E6', '#FFFFFF'],
  [4, 'bald', 'black', 'fullbeard', '#4AFF8B', '#1D1D1F', 'quarters', '77', '#E2FBEA'],
  [1, 'quiff', 'black', 'none', '#FFFFFF', '#4AFF8B', 'checks', '100', '#E3F7EA'],
];

export const LEGENDS: Legend[] = ROWS.map(([skin, hair, color, face, kit, trim, pattern, num, bg, headband, glasses], i) => ({
  id: 'legend-' + String(i + 1).padStart(2, '0'),
  skin: SKIN[skin]!,
  hair,
  hairColor: HAIR[color],
  face,
  kit,
  trim,
  pattern,
  num,
  bg,
  ...(headband ? { headband } : {}),
  ...(glasses ? { glasses: true } : {})
}));

export const LEGEND_BY_ID: Record<string, Legend> = Object.fromEntries(LEGENDS.map((l) => [l.id, l]));
