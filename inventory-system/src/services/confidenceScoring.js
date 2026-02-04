/**
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * This file contains trade secrets and proprietary information of Card Sight.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited.
 * 
 * Copyright (c) 2024-2026 Card Sight. All Rights Reserved.
 * 
 * For licensing inquiries: legal@cardsight.com
 */

/**
 * Confidence Scoring Service
 * Scores eBay listings based on how well they match the target card
 */

/**
 * Calculate confidence score for an eBay listing
 * @param {string} title - eBay listing title
 * @param {Object} card - Card data from PSA { name, set, number, grade }
 * @param {Array} aspects - eBay item aspects (localizedAspects)
 * @returns {Object} { score: 0-10, category: 'high'|'medium'|'low' }
 */
export function scoreTitle(title, card, aspects = []) {
  if (!title || !card) {
    return { score: 0, category: 'low' };
  }

  const lowerTitle = title.toLowerCase();
  let rawScore = 0;
  const maxPossible = 12; // Maximum additive score

  // +3: Title contains card number
  if (card.number) {
    const cardNumber = card.number.toLowerCase();
    // Handle various formats: "074/073", "74/73", "#74", etc.
    const numberVariants = [
      cardNumber,
      cardNumber.replace(/^0+/, ''), // Remove leading zeros
      cardNumber.replace(/\//g, ' '), // Space instead of slash
      `#${cardNumber.replace(/\/.*$/, '')}`, // Just the first number with #
    ];
    if (numberVariants.some(v => lowerTitle.includes(v))) {
      rawScore += 3;
    }
  }

  // +2: Title contains player/character name
  if (card.name) {
    // Extract the main name (first word or two, often the character/player)
    const nameParts = card.name.toLowerCase().split(/\s+/);
    const primaryName = nameParts[0];
    if (primaryName && primaryName.length > 2 && lowerTitle.includes(primaryName)) {
      rawScore += 2;
    }
  }

  // +2: Title contains set name (fuzzy match)
  if (card.set) {
    const setName = card.set.toLowerCase();
    // Try full set name and key words
    const setWords = setName.split(/\s+/).filter(w => w.length > 3);
    const fullMatch = lowerTitle.includes(setName);
    const partialMatch = setWords.length > 0 && setWords.some(w => lowerTitle.includes(w));
    if (fullMatch) {
      rawScore += 2;
    } else if (partialMatch) {
      rawScore += 1; // Partial credit for partial match
    }
  }

  // +3: Title contains PSA <grade>
  if (card.grade) {
    const gradePatterns = [
      `psa ${card.grade}`,
      `psa${card.grade}`,
      `psa-${card.grade}`,
      `gem mint ${card.grade}`,
      `gem-mint ${card.grade}`,
    ];
    if (gradePatterns.some(p => lowerTitle.includes(p))) {
      rawScore += 3;
    } else if (lowerTitle.includes('psa') && lowerTitle.includes(card.grade)) {
      rawScore += 2; // Partial credit if both PSA and grade appear but not together
    }
  }

  // +2: Item aspects show Graded by = PSA
  if (aspects && aspects.length > 0) {
    const gradedByAspect = aspects.find(a => 
      a.name?.toLowerCase() === 'graded' || 
      a.name?.toLowerCase() === 'grading company' ||
      a.name?.toLowerCase() === 'professional grader'
    );
    if (gradedByAspect && gradedByAspect.value?.toLowerCase().includes('psa')) {
      rawScore += 2;
    }
  }

  // -3: Title contains BGS or CGC (competitor grading)
  if (/\b(bgs|cgc|beckett|sgc)\b/i.test(lowerTitle)) {
    rawScore -= 3;
  }

  // -1: Title contains damage indicators
  if (/\b(cracked|damaged|defect|error|misprint|oc|off.?center)\b/i.test(lowerTitle)) {
    rawScore -= 1;
  }

  // -2: Title seems to be a different grade
  if (card.grade) {
    const gradeNum = parseInt(card.grade, 10);
    // Check if title mentions a different PSA grade
    const otherGradeMatch = lowerTitle.match(/psa\s*(\d+)/i);
    if (otherGradeMatch) {
      const foundGrade = parseInt(otherGradeMatch[1], 10);
      if (foundGrade !== gradeNum) {
        rawScore -= 2;
      }
    }
  }

  // Normalize to 0-10 scale
  const normalizedScore = Math.max(0, Math.min(10, (rawScore / maxPossible) * 10));
  const finalScore = Math.round(normalizedScore * 10) / 10; // Round to 0.1

  // Determine category
  let category;
  if (finalScore >= 8) {
    category = 'high';
  } else if (finalScore >= 5) {
    category = 'medium';
  } else {
    category = 'low';
  }

  return {
    score: finalScore,
    category,
  };
}

/**
 * Add confidence scores to an array of eBay listings
 * @param {Array} listings - Array of eBay listing objects
 * @param {Object} card - Card data from PSA
 * @returns {Array} Listings with confidence and confidenceCategory added
 */
export function scoreListings(listings, card) {
  if (!listings || !Array.isArray(listings)) return [];

  return listings.map(listing => {
    const { score, category } = scoreTitle(listing.title, card, listing.aspects);
    return {
      ...listing,
      confidence: score,
      confidenceCategory: category,
    };
  });
}

/**
 * Get the highest confidence listing from an array
 * @param {Array} listings - Scored listings
 * @returns {Object|null} Highest confidence listing or null
 */
export function getHighestConfidenceListing(listings) {
  if (!listings || listings.length === 0) return null;
  
  return listings.reduce((best, current) => {
    if (!best || (current.confidence || 0) > (best.confidence || 0)) {
      return current;
    }
    return best;
  }, null);
}

export default {
  scoreTitle,
  scoreListings,
  getHighestConfidenceListing,
};
