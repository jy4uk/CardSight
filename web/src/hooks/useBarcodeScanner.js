import { useEffect, useRef, useCallback } from 'react';

/**
 * Global barcode scanner hook
 * Listens for rapid-fire keystrokes (typical of barcode scanners) ending with Enter
 * Ignores input when user is focused on form elements
 */
export function useBarcodeScanner(onScan, options = {}) {
  const {
    minLength = 6,           // Minimum barcode length
    maxDelay = 200,          // Max ms between keystrokes for scanner input
    enabled = true,          // Whether scanning is enabled
  } = options;

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef(null);

  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = activeElement.isContentEditable;
    const isFormElement = ['input', 'textarea', 'select'].includes(tagName);
    
    return isFormElement || isEditable;
  }, []);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // Ignore if user is typing in a form field
    if (isInputFocused()) {
      resetBuffer();
      return;
    }

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // If too much time has passed, reset the buffer (human typing speed)
    if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
      resetBuffer();
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Handle Enter key - process the buffer
    if (event.key === 'Enter') {
      const barcode = bufferRef.current.trim();
      
      if (barcode.length >= minLength) {
        event.preventDefault();
        onScan(barcode);
      }
      
      resetBuffer();
      return;
    }

    // Only capture printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      bufferRef.current += event.key;
      
      // Set a timeout to clear buffer if no more input comes (500ms)
      timeoutRef.current = setTimeout(() => {
        resetBuffer();
      }, 500);
    }
  }, [enabled, isInputFocused, maxDelay, minLength, onScan, resetBuffer]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, handleKeyDown]);

  return {
    resetBuffer,
  };
}

export default useBarcodeScanner;
