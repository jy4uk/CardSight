export const conditionColors = {
  NM: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  LP: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  MP: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  HP: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  DMG: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const gradeColors = {
  10: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  9: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  8: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  7: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  default: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

export const gameColors = {
  pokemon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  onepiece: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  mtg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  yugioh: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export const getConditionColor = (condition) => {
  return conditionColors[condition] || conditionColors.NM;
};

export const getGradeColor = (grade) => {
  const numGrade = parseInt(grade);
  if (numGrade >= 10) return gradeColors[10];
  if (numGrade >= 9) return gradeColors[9];
  if (numGrade >= 8) return gradeColors[8];
  if (numGrade >= 7) return gradeColors[7];
  return gradeColors.default;
};

export const getGameColor = (game) => {
  return gameColors[game] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
};
