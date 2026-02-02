export const getConditionOrGrade = (item) => {
  if (!item) return '';
  if (item.card_type === 'raw') {
    return item.condition || 'NM';
  }
  const type = item.card_type?.toUpperCase() || '';
  const grade = item.grade || '';
  const qualifier = item.grade_qualifier || '';
  return `${type} ${grade}${qualifier}`.trim();
};

export const cleanCardName = (name) => {
  if (!name) return '';
  return name
    .replace(/\s+\d+\s+\d+$/, '')
    .replace(/\s*-\s*\d+\/\d+$/, '')
    .trim();
};

export const cleanSetName = (name) => {
  if (!name) return '';
  return name
    .replace(/^One Piece Card Game\s*-?\s*/i, '')
    .replace(/\s*Booster Pack$/i, '')
    .replace(/\s*-\s*\[OP-?\d+\]$/i, '')
    .trim();
};

export const cleanPSACardName = (name) => {
  if (!name) return '';
  const prefixPattern = /^(Fa|Sr|Ar|Sar|Ir|Sir|Ur|Chr|Csr|Tg|Gg|Rr|Pr|Hr)\//i;
  return name.replace(prefixPattern, '').trim();
};

export const extractNumericGrade = (psaGrade) => {
  if (!psaGrade) return '';
  const match = psaGrade.match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : '';
};

export const getInitialFormData = () => ({
  barcode_id: '',
  card_name: '',
  set_name: '',
  card_number: '',
  game: '',
  card_type: 'raw',
  condition: '',
  grade: '',
  grade_qualifier: '',
  purchase_price: '',
  front_label_price: '',
  image_url: '',
  cert_number: '',
  notes: '',
});

export const GAME_PREFIXES = [
  { pattern: /^POKEMON\s+/i, game: 'pokemon' },
  { pattern: /^ONE PIECE\s+/i, game: 'onepiece' },
  { pattern: /^ONEPIECE\s+/i, game: 'onepiece' },
  { pattern: /^MTG\s+/i, game: 'mtg' },
  { pattern: /^MAGIC\s+/i, game: 'mtg' },
  { pattern: /^MAGIC:?\s*THE GATHERING\s+/i, game: 'mtg' },
  { pattern: /^YU-?GI-?OH!?\s+/i, game: 'yugioh' },
  { pattern: /^YUGIOH!?\s+/i, game: 'yugioh' },
];

export const POKEMON_SERIES_PREFIXES = [
  { pattern: /^(SWORD\s*&?\s*SHIELD)\s+/i, series: 'Sword & Shield' },
  { pattern: /^(SUN\s*&?\s*MOON)\s+/i, series: 'Sun & Moon' },
  { pattern: /^(XY)\s+/i, series: 'XY' },
  { pattern: /^(BLACK\s*&?\s*WHITE)\s+/i, series: 'Black & White' },
  { pattern: /^(SCARLET\s*&?\s*VIOLET)\s+/i, series: 'Scarlet & Violet' },
  { pattern: /^(DIAMOND\s*&?\s*PEARL)\s+/i, series: 'Diamond & Pearl' },
  { pattern: /^(HEARTGOLD\s*&?\s*SOULSILVER)\s+/i, series: 'HeartGold & SoulSilver' },
  { pattern: /^(PLATINUM)\s+/i, series: 'Platinum' },
  { pattern: /^(EX)\s+/i, series: 'EX' },
];

export const detectGameFromSet = (setName) => {
  if (!setName) return null;
  for (const { pattern, game } of GAME_PREFIXES) {
    if (pattern.test(setName)) {
      return game;
    }
  }
  return null;
};
