import { useState, useRef, useCallback } from 'react';
import { searchTCGProducts } from '../api';
import { cleanCardName, cleanSetName } from '../utils/cardHelpers';

export function useTCGSearch() {
  const [tcgProducts, setTcgProducts] = useState([]);
  const [tcgLoading, setTcgLoading] = useState(false);
  const [tcgError, setTcgError] = useState(null);
  const tcgDebounceRef = useRef(null);

  const searchTCG = useCallback(async (cardName, setName = '', cardNumber = '', categoryId = null) => {
    if (!cardName || cardName.trim().length < 2) {
      setTcgProducts([]);
      return [];
    }

    if (tcgDebounceRef.current) {
      clearTimeout(tcgDebounceRef.current);
    }

    setTcgLoading(true);
    setTcgError(null);

    try {
      const cleanedCardName = cleanCardName(cardName);
      const cleanedSetName = cleanSetName(setName);

      const searchWithFallback = async () => {
        const searchParams = { categoryId };

        // Try with full info first
        let results = await searchTCGProducts(cleanedCardName, cleanedSetName, cardNumber, searchParams);
        if (results?.products?.length > 0) return results.products;

        // Fallback: try without card number
        results = await searchTCGProducts(cleanedCardName, cleanedSetName, '', searchParams);
        if (results?.products?.length > 0) return results.products;

        // Fallback: try without set name
        results = await searchTCGProducts(cleanedCardName, '', cardNumber, searchParams);
        if (results?.products?.length > 0) return results.products;

        // Final fallback: just card name
        results = await searchTCGProducts(cleanedCardName, '', '', searchParams);
        return results?.products || [];
      };

      const products = await searchWithFallback();
      setTcgProducts(products);
      return products;
    } catch (err) {
      console.error('TCG search error:', err);
      setTcgError(err.message || 'Failed to search TCG products');
      setTcgProducts([]);
      return [];
    } finally {
      setTcgLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback((cardName, setName, cardNumber, categoryId, delay = 500) => {
    if (tcgDebounceRef.current) {
      clearTimeout(tcgDebounceRef.current);
    }

    tcgDebounceRef.current = setTimeout(() => {
      searchTCG(cardName, setName, cardNumber, categoryId);
    }, delay);
  }, [searchTCG]);

  const resetTCG = useCallback(() => {
    if (tcgDebounceRef.current) {
      clearTimeout(tcgDebounceRef.current);
    }
    setTcgProducts([]);
    setTcgError(null);
  }, []);

  return {
    tcgProducts,
    tcgLoading,
    tcgError,
    searchTCG,
    debouncedSearch,
    resetTCG,
  };
}

export default useTCGSearch;
