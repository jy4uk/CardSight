import { useState, useRef, useCallback } from 'react';
import { fetchPSAData, isPSACertNumber } from '../api';
import { toTitleCase } from '../utils/formatters';
import {
  cleanPSACardName,
  extractNumericGrade,
  GAME_PREFIXES,
  POKEMON_SERIES_PREFIXES,
} from '../utils/cardHelpers';

export function usePSALookup() {
  const [psaData, setPsaData] = useState(null);
  const [psaLoading, setPsaLoading] = useState(false);
  const [psaError, setPsaError] = useState(null);
  const psaFetchedRef = useRef(null);

  const parseSetName = useCallback((rawSet) => {
    if (!rawSet) return { game: null, series: '', setName: '', setCode: '', tcgSetName: '' };

    let setName = rawSet;
    let detectedGame = null;
    let detectedSeries = '';
    let setCode = '';

    for (const { pattern, game } of GAME_PREFIXES) {
      if (pattern.test(setName)) {
        detectedGame = game;
        setName = setName.replace(pattern, '');
        break;
      }
    }

    const onePieceMatch = setName.match(/^(OP\d+[A-Z]?)-(.+)$/i);
    if (onePieceMatch || detectedGame === 'onepiece') {
      if (onePieceMatch) {
        setCode = onePieceMatch[1].toUpperCase();
        const lexicalName = toTitleCase(onePieceMatch[2].trim());
        return {
          game: 'onepiece',
          series: '',
          setName: `${lexicalName} - ${setCode}`,
          setCode,
          tcgSetName: lexicalName,
        };
      }
    }

    if (detectedGame === 'pokemon') {
      for (const { pattern, series } of POKEMON_SERIES_PREFIXES) {
        if (pattern.test(setName)) {
          detectedSeries = series;
          setName = setName.replace(pattern, '');
          break;
        }
      }
    }

    const finalSetName = toTitleCase(setName.trim());
    return {
      game: detectedGame,
      series: detectedSeries,
      setName: finalSetName,
      setCode: '',
      tcgSetName: finalSetName,
    };
  }, []);

  const lookupPSA = useCallback(async (certNumber) => {
    if (!certNumber || psaFetchedRef.current === certNumber) {
      return null;
    }

    setPsaLoading(true);
    setPsaError(null);
    psaFetchedRef.current = certNumber;

    try {
      const result = await fetchPSAData(certNumber);

      if (result.success && result.psa) {
        setPsaData(result);

        const cardName = toTitleCase(cleanPSACardName(result.psa.name));
        const cardNumber = result.psa.number;
        const parsedSet = parseSetName(result.psa.set);
        const numericGrade = extractNumericGrade(result.psa.grade);

        return {
          success: true,
          cardName,
          cardNumber,
          grade: numericGrade,
          ...parsedSet,
          rawPsaData: result,
        };
      } else {
        const error = result.error || 'PSA certification not found';
        setPsaError(error);
        return { success: false, error };
      }
    } catch (err) {
      const error = err.message || 'Failed to fetch PSA data';
      setPsaError(error);
      return { success: false, error };
    } finally {
      setPsaLoading(false);
    }
  }, [parseSetName]);

  const resetPSA = useCallback(() => {
    setPsaData(null);
    setPsaError(null);
    psaFetchedRef.current = null;
  }, []);

  return {
    psaData,
    psaLoading,
    psaError,
    lookupPSA,
    resetPSA,
    isPSACertNumber,
  };
}

export default usePSALookup;
