import { useEffect, useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TUTORIAL_SEEN_KEY = 'cardsight_tutorial_seen';
const PURCHASE_TUTORIAL_SEEN_KEY = 'cardsight_purchase_tutorial_seen';
const TRADE_TUTORIAL_SEEN_KEY = 'cardsight_trade_tutorial_seen';

// Helper to detect mobile
const isMobile = () => window.innerWidth < 640;

// Purchase Modal tutorial steps - comprehensive field-by-field walkthrough
const getPurchaseTutorialSteps = () => {
  const mobile = isMobile();
  return [
  {
    popover: {
      title: '💰 Recording Purchases',
      description: 'Let\'s walk through adding a card to your inventory. We\'ll cover each field and the powerful auto-fill features!',
      side: 'center',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="purchase-barcode-field"]',
    popover: {
      title: mobile ? '🔢 Step 1: Cert Number' : '📱 Step 1: Barcode / Cert #',
      description: mobile 
        ? 'Type a PSA cert number here. For PSA cards, this auto-fetches card details, grade, and recent sales data!'
        : 'Start here! Scan a barcode or type a PSA cert number. For PSA cards, this auto-fetches card details, grade, and recent sales data.',
      side: 'bottom',
      align: 'start',
    },
    disableActiveInteraction: false, // Allow user to interact
  },
  {
    element: '[data-tutorial="purchase-psa-panel"]',
    popover: {
      title: '🏆 PSA Auto-Lookup',
      description: 'When a PSA cert is detected, this panel shows the card info, grade, and recent auction prices. Use these to set your buy price!',
      side: 'bottom',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="purchase-card-name-field"]',
    popover: {
      title: '✏️ Step 2: Card Name',
      description: 'Type the card name here. As you type, we search TCGPlayer for matching cards. Try typing a card name like "Charizard" to continue!',
      side: 'top',
      align: 'start',
    },
    // Mark this step as requiring input validation
    requiresInput: true,
    inputSelector: '[data-tutorial="purchase-card-name-field"] input',
    disableActiveInteraction: false,
  },
  {
    element: '[data-tutorial="purchase-tcg-match"]',
    popover: {
      title: '🔍 Step 3: Match Your Card',
      description: 'Click on the matching card image! This auto-fills the card image, set name, and fetches the current TCGPlayer market price.',
      side: 'top',
      align: 'center',
    },
    disableActiveInteraction: false,
  },
  {
    element: '[data-tutorial="purchase-selected-card"]',
    popover: {
      title: '✅ Card Matched!',
      description: 'Great! Your card is matched. Click "View on TCGPlayer" to verify the current market price in a new tab.',
      side: 'top',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="purchase-set-field"]',
    popover: {
      title: '📦 Set Name',
      description: 'The set name is auto-filled when you match a card. You can also type it manually if needed.',
      side: 'bottom',
      align: 'start',
    }
  },
  {
    element: '[data-tutorial="purchase-type-fields"]',
    popover: {
      title: '🎮 Game, Type & Condition',
      description: 'You can manually select the game (Pokemon, One Piece, etc.), card type (Raw, PSA, CGC, BGS), and condition/grade. These are auto-detected from PSA lookups and when you select matches for singles!',
      side: 'bottom',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="purchase-cardladder-link"]',
    popover: {
      title: '📊 Card Ladder (Graded Cards)',
      description: 'For graded cards, click here to check historical sales on Card Ladder. The cert number is auto-copied to your clipboard!',
      side: 'top',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="purchase-price-fields"]',
    popover: {
      title: '💵 Step 4: Set Your Prices',
      description: 'Enter your Purchase Price (what you paid) and Market Price (selling price). Card Sight will do the percentages for you!',
      side: 'top',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="purchase-add-button"]',
    popover: {
      title: '➕ Step 5: Add to Purchase',
      description: 'Click to stage this card. You can add multiple cards before completing the purchase. Each card is saved to your inventory when once you complete the purchase!',
      side: 'top',
      align: 'center',
    }
  },
  {
    popover: {
      title: '🎉 You\'re Ready!',
      description: 'You now know how to use PSA lookups, TCGPlayer matching, and Card Ladder research. Happy collecting!',
      side: 'center',
      align: 'center',
    }
  }
];
};

// Trade Modal tutorial steps - comprehensive field-by-field walkthrough
const getTradeTutorialSteps = () => {
  const mobile = isMobile();
  return [
  {
    popover: {
      title: '🔄 Recording Trades',
      description: 'Let\'s walk through recording a trade. We\'ll cover how to value cards coming in and going out!',
      side: 'center',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="trade-barcode-field"]',
    popover: {
      title: mobile ? '� Step 1: Cert Number' : '�� Step 1: Barcode / Cert #',
      description: mobile
        ? 'Type a PSA cert number here. For graded cards, this auto-fetches card details and recent sales!'
        : 'Start by scanning a barcode or typing a PSA cert number. For graded cards, this auto-fetches card details and recent sales!',
      side: 'bottom',
      align: 'start',
    },
    disableActiveInteraction: false,
  },
  {
    element: '[data-tutorial="trade-psa-panel"]',
    popover: {
      title: '🏆 PSA Auto-Lookup',
      description: 'This panel shows the card info, grade, and recent auction prices from PSA. Use these to determine a fair trade value!',
      side: 'bottom',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="trade-card-name-field"]',
    popover: {
      title: '✏️ Step 2: Card Name & Set',
      description: 'Type the card name to search TCGPlayer. The set name helps narrow down the exact card. Try typing a card name to continue!',
      side: 'top',
      align: 'start',
    },
    // Mark this step as requiring input validation
    requiresInput: true,
    inputSelector: '[data-tutorial="trade-card-name-field"] input',
    disableActiveInteraction: false,
  },
  {
    element: '[data-tutorial="trade-tcg-match"]',
    popover: {
      title: '🔍 Step 3: Match Your Card',
      description: 'Click on the matching card image! This auto-fills the image, set info, and fetches the current TCGPlayer market price.',
      side: 'top',
      align: 'center',
    },
    disableActiveInteraction: false,
  },
  {
    element: '[data-tutorial="trade-value-fields"]',
    popover: {
      title: '💵 Step 4: Value & Trade %',
      description: 'Enter the card number, market value, and trade percentage. The trade % (e.g., 80%) calculates what you\'ll credit toward the trade.',
      side: 'top',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="trade-tcgplayer-link"]',
    popover: {
      title: '🛒 View on TCGPlayer',
      description: 'For raw cards, click to view the exact listing on TCGPlayer with the condition pre-selected. Great for price verification!',
      side: 'top',
      align: 'center',
    }
  },
  {
    element: '[data-tutorial="trade-cardladder-link"]',
    popover: {
      title: '📊 Card Ladder (Graded)',
      description: 'For graded cards, click to check historical sales on Card Ladder. The cert number is auto-copied to your clipboard!',
      side: 'top',
      align: 'center',
    }
  },
  {
    popover: {
      title: '🎉 Trade Recording Complete!',
      description: 'Cards you receive (trade-ins) go to your inventory at the trade value. Cards you give out are marked as traded. The cash difference is calculated automatically!',
      side: 'center',
      align: 'center',
    }
  }
];
};

// Define the tutorial steps with page navigation
const getTutorialSteps = (isAuthenticated, onNavigate) => {
  const mobile = isMobile();
  const steps = [
    {
      popover: {
        title: '👋 Welcome to Card Sight!',
        description: 'Let\'s take a quick tour of all the features. We\'ll visit each page to show you around.',
        side: 'center',
        align: 'center',
      }
    },
  ];

  if (isAuthenticated) {
    // === INVENTORY PAGE ===
    steps.push(
      {
        element: '[data-tutorial="search-filter"]',
        popover: {
          title: '🔍 Search & Filter',
          description: mobile
            ? 'Find cards instantly by name or set. Use filters for game, condition, or price range.'
            : 'Find cards instantly by name, set, or barcode. Use filters for game, condition, or price range.',
          side: 'bottom',
          align: 'start',
        },
      },
      // Cart button step - only on desktop since cart is hidden on mobile
      ...(mobile ? [] : [{
        element: '[data-tutorial="cart-button"]',
        popover: {
          title: '🛒 Shopping Cart',
          description: 'Scan barcodes or click cards to add them to the cart. Complete sales with cash or card.',
          side: 'bottom',
          align: 'end',
        },
      }]),
      {
        element: mobile ? '[data-tutorial="mobile-nav-inventory"]' : '[data-tutorial="nav-tabs"]',
        popover: {
          title: '📍 Navigation',
          description: mobile 
            ? 'Use these tabs at the bottom to switch between sections. Let\'s explore each one!'
            : 'These tabs let you switch between different sections. Let\'s explore each one!',
          side: mobile ? 'top' : 'bottom',
          align: 'center',
        },
        onHighlightStarted: () => onNavigate('inventory'),
      },
      // === INTAKE PAGE ===
      {
        element: mobile ? '[data-tutorial="mobile-nav-intake"]' : '[data-tutorial="intake-page"]',
        popover: {
          title: '📦 Intake Page',
          description: 'This is your intake hub for adding new inventory. Let\'s explore each section!',
          side: mobile ? 'top' : 'bottom',
          align: 'center',
        },
        onHighlightStarted: () => onNavigate('intake'),
      },
      {
        element: '[data-tutorial="purchase-panel"]',
        popover: {
          title: '💰 Purchases Section',
          description: 'View your purchase history here. This shows all cards you\'ve bought with dates, prices, and profit tracking.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tutorial="record-purchase-btn"]',
        popover: {
          title: '➕ Record Purchase',
          description: 'Click here to add new cards! Scan barcodes or search TCGPlayer to auto-fill card details, market prices, and set your buy price.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tutorial="trade-panel"]',
        popover: {
          title: '🔄 Trades Section',
          description: 'View your trade history here. Track what you traded away and what you received.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tutorial="record-trade-btn"]',
        popover: {
          title: '➕ Record Trade',
          description: 'Click here to record a trade deal. Add cards you\'re giving up and cards you\'re receiving to track the exchange.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tutorial="saved-deals-section"]',
        popover: {
          title: '💾 Saved Deals',
          description: 'Deals you save for later appear here. Great for when a customer wants to think about it or you need to pause mid-transaction.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-tutorial="pending-barcodes-section"]',
        popover: {
          title: '📱 Pending Barcodes',
          description: 'Cards scanned but not yet in inventory appear here. Assign barcodes to new cards before adding them to your collection.',
          side: 'top',
          align: 'end',
        },
      },
      // === INSIGHTS PAGE ===
      {
        element: mobile ? '[data-tutorial="mobile-nav-insights"]' : '[data-tutorial="insights-page"]',
        popover: {
          title: '📊 Insights Page',
          description: 'Track your business performance with analytics, sales data, and card show management.',
          side: mobile ? 'top' : 'bottom',
          align: 'center',
        },
        onHighlightStarted: () => onNavigate('insights'),
      },
      {
        element: '[data-tutorial="insights-stats"]',
        popover: {
          title: '📈 Performance Stats',
          description: 'See your inventory value, total sales, profit margins, and trends at a glance.',
          side: 'bottom',
          align: 'center',
        },
      },
      // === BARCODES PAGE (Desktop only) ===
      ...(mobile ? [] : [{
        element: '[data-tutorial="barcodes-page"]',
        popover: {
          title: '🏷️ Barcode Generator',
          description: 'Generate and print barcode labels for your inventory. Great for card shows!',
          side: 'top',
          align: 'center',
        },
        onHighlightStarted: () => onNavigate('barcodes'),
      }]),
      // === BACK TO INVENTORY & FINISH ===
      ...(mobile ? [] : [{
        element: '[data-tutorial="settings-button"]',
        popover: {
          title: '⚙️ Settings',
          description: 'Update your profile, manage your account, and restart this tutorial anytime.',
          side: 'bottom',
          align: 'end',
        },
        onHighlightStarted: () => onNavigate('inventory'),
      }])
    );
  } else {
    // Guest user steps (viewing public inventory only)
    steps.push(
      {
        element: '[data-tutorial="search-filter"]',
        popover: {
          title: '🔍 Search & Filter',
          description: 'Search for cards by name or set. Use filters to find exactly what you\'re looking for.',
          side: 'bottom',
          align: 'start',
        }
      }
    );
  }

  // Final step
  steps.push({
    popover: {
      title: '🎉 You\'re All Set!',
      description: 'You\'ve seen all the key features! Restart this tutorial anytime from Settings. Happy collecting!',
      side: 'center',
      align: 'center',
    }
  });

  return steps;
};

export function useTutorial(isAuthenticated, setCurrentView) {
  const driverRef = useRef(null);
  const currentViewRef = useRef(setCurrentView);

  // Keep ref updated
  useEffect(() => {
    currentViewRef.current = setCurrentView;
  }, [setCurrentView]);

  // Navigation handler for tutorial steps
  const handleNavigate = useCallback((view) => {
    if (currentViewRef.current) {
      currentViewRef.current(view);
      // Small delay to let the view render
      return new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);

  // Check if tutorial has been seen
  const hasSeen = useCallback(() => {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
  }, []);

  // Mark tutorial as seen
  const markAsSeen = useCallback(() => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  }, []);

  // Reset tutorial (for "Show Tutorial Again")
  const resetTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_SEEN_KEY);
  }, []);

  // Start the tutorial
  const startTutorial = useCallback((force = false) => {
    // Don't start if already seen (unless forced)
    if (!force && hasSeen()) {
      return;
    }

    // Ensure we start on inventory page
    if (currentViewRef.current) {
      currentViewRef.current('inventory');
    }

    // Small delay to ensure DOM elements are rendered
    setTimeout(() => {
      const steps = getTutorialSteps(isAuthenticated, handleNavigate);
      
      driverRef.current = driver({
        showProgress: true,
        animate: true,
        overlayColor: '#000',
        overlayOpacity: 0.75,
        smoothScroll: true,
        allowClose: true,
        stagePadding: 10,
        popoverClass: 'cardsight-tutorial-popover',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Get Started!',
        onDestroyed: () => {
          markAsSeen();
          // Return to inventory when done
          if (currentViewRef.current) {
            currentViewRef.current('inventory');
          }
        },
        steps: steps,
      });

      // Add Enter key handler
      const handleKeyDown = (e) => {
        if (e.key === 'Enter' && driverRef.current) {
          e.preventDefault();
          driverRef.current.moveNext();
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      // Store cleanup function
      driverRef.current._keydownHandler = handleKeyDown;

      driverRef.current.drive();
    }, 500);
  }, [isAuthenticated, hasSeen, markAsSeen, handleNavigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        if (driverRef.current._keydownHandler) {
          document.removeEventListener('keydown', driverRef.current._keydownHandler);
        }
        driverRef.current.destroy();
      }
    };
  }, []);

  return {
    startTutorial,
    resetTutorial,
    hasSeen,
  };
}

// Separate hook for Purchase Modal tutorial
export function usePurchaseTutorial() {
  const driverRef = useRef(null);

  const hasSeen = useCallback(() => {
    return localStorage.getItem(PURCHASE_TUTORIAL_SEEN_KEY) === 'true';
  }, []);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(PURCHASE_TUTORIAL_SEEN_KEY, 'true');
  }, []);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(PURCHASE_TUTORIAL_SEEN_KEY);
  }, []);

  const startTutorial = useCallback((force = false) => {
    if (!force && hasSeen()) {
      return;
    }

    // Wait for modal elements to render
    setTimeout(() => {
      // Filter steps to only include ones where elements exist
      const allSteps = getPurchaseTutorialSteps();
      const availableSteps = allSteps.filter(step => {
        if (!step.element) return true; // Include non-element steps (welcome/tips)
        return document.querySelector(step.element);
      });

      if (availableSteps.length < 2) {
        // Not enough elements visible, skip tutorial
        markAsSeen();
        return;
      }

      let inputListener = null;
      let resizeObserver = null;

      driverRef.current = driver({
        showProgress: true,
        animate: true,
        overlayColor: '#000',
        overlayOpacity: 0.75,
        smoothScroll: true,
        allowClose: true,
        stagePadding: 10,
        popoverClass: 'cardsight-tutorial-popover',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Got it!',
        onNextClick: () => {
          const currentStep = availableSteps[driverRef.current.getActiveIndex()];
          if (currentStep?.requiresInput) {
            const input = document.querySelector(currentStep.inputSelector);
            if (!input || input.value.trim().length < 2) {
              return; // Block progression
            }
          }
          driverRef.current.moveNext();
        },
        onHighlightStarted: () => {
          // Cleanup previous listeners
          if (inputListener) {
            inputListener.element?.removeEventListener('input', inputListener.handler);
            inputListener = null;
          }
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
          }

          const currentStep = availableSteps[driverRef.current.getActiveIndex()];
          
          // Handle input validation steps
          if (currentStep?.requiresInput) {
            const input = document.querySelector(currentStep.inputSelector);
            const updateButtonState = () => {
              const nextBtn = document.querySelector('.driver-popover-next-btn');
              if (nextBtn) {
                if (input && input.value.trim().length >= 2) {
                  nextBtn.classList.remove('tutorial-btn-disabled');
                } else {
                  nextBtn.classList.add('tutorial-btn-disabled');
                }
              }
              // Refresh highlight when content changes (for TCG results appearing)
              if (driverRef.current) {
                driverRef.current.refresh();
              }
            };
            setTimeout(updateButtonState, 100);
            if (input) {
              input.addEventListener('input', updateButtonState);
              inputListener = { element: input, handler: updateButtonState };
            }
          }

          // Set up resize observer for the highlighted element
          if (currentStep?.element) {
            const el = document.querySelector(currentStep.element);
            if (el) {
              resizeObserver = new ResizeObserver(() => {
                if (driverRef.current) {
                  driverRef.current.refresh();
                }
              });
              resizeObserver.observe(el);
            }
          }
        },
        onDestroyed: () => {
          if (inputListener) {
            inputListener.element?.removeEventListener('input', inputListener.handler);
          }
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
          if (driverRef.current?._keydownHandler) {
            document.removeEventListener('keydown', driverRef.current._keydownHandler);
          }
          markAsSeen();
        },
        steps: availableSteps,
      });

      // Add Enter key handler
      const handleKeyDown = (e) => {
        if (e.key === 'Enter' && driverRef.current) {
          e.preventDefault();
          // Check if current step requires input validation
          const currentStep = availableSteps[driverRef.current.getActiveIndex()];
          if (currentStep?.requiresInput) {
            const input = document.querySelector(currentStep.inputSelector);
            if (!input || input.value.trim().length < 2) {
              return; // Block if input validation fails
            }
          }
          driverRef.current.moveNext();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      driverRef.current._keydownHandler = handleKeyDown;

      driverRef.current.drive();
    }, 800);
  }, [hasSeen, markAsSeen]);

  useEffect(() => {
    return () => {
      if (driverRef.current) {
        if (driverRef.current._keydownHandler) {
          document.removeEventListener('keydown', driverRef.current._keydownHandler);
        }
        driverRef.current.destroy();
      }
    };
  }, []);

  return { startTutorial, resetTutorial, hasSeen };
}

// Separate hook for Trade Modal tutorial
export function useTradeTutorial() {
  const driverRef = useRef(null);

  const hasSeen = useCallback(() => {
    return localStorage.getItem(TRADE_TUTORIAL_SEEN_KEY) === 'true';
  }, []);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(TRADE_TUTORIAL_SEEN_KEY, 'true');
  }, []);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(TRADE_TUTORIAL_SEEN_KEY);
  }, []);

  const startTutorial = useCallback((force = false) => {
    if (!force && hasSeen()) {
      return;
    }

    // Wait for modal elements to render
    setTimeout(() => {
      // Filter steps to only include ones where elements exist
      const allSteps = getTradeTutorialSteps();
      const availableSteps = allSteps.filter(step => {
        if (!step.element) return true; // Include non-element steps (welcome/tips)
        return document.querySelector(step.element);
      });

      if (availableSteps.length < 2) {
        // Not enough elements visible, skip tutorial
        markAsSeen();
        return;
      }

      let inputListener = null;
      let resizeObserver = null;

      driverRef.current = driver({
        showProgress: true,
        animate: true,
        overlayColor: '#000',
        overlayOpacity: 0.75,
        smoothScroll: true,
        allowClose: true,
        stagePadding: 10,
        popoverClass: 'cardsight-tutorial-popover',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Got it!',
        onNextClick: () => {
          const currentStep = availableSteps[driverRef.current.getActiveIndex()];
          if (currentStep?.requiresInput) {
            const input = document.querySelector(currentStep.inputSelector);
            if (!input || input.value.trim().length < 2) {
              return; // Block progression
            }
          }
          driverRef.current.moveNext();
        },
        onHighlightStarted: () => {
          // Cleanup previous listeners
          if (inputListener) {
            inputListener.element?.removeEventListener('input', inputListener.handler);
            inputListener = null;
          }
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
          }

          const currentStep = availableSteps[driverRef.current.getActiveIndex()];
          
          // Handle input validation steps
          if (currentStep?.requiresInput) {
            const input = document.querySelector(currentStep.inputSelector);
            const updateButtonState = () => {
              const nextBtn = document.querySelector('.driver-popover-next-btn');
              if (nextBtn) {
                if (input && input.value.trim().length >= 2) {
                  nextBtn.classList.remove('tutorial-btn-disabled');
                } else {
                  nextBtn.classList.add('tutorial-btn-disabled');
                }
              }
              // Refresh highlight when content changes
              if (driverRef.current) {
                driverRef.current.refresh();
              }
            };
            setTimeout(updateButtonState, 100);
            if (input) {
              input.addEventListener('input', updateButtonState);
              inputListener = { element: input, handler: updateButtonState };
            }
          }

          // Set up resize observer for the highlighted element
          if (currentStep?.element) {
            const el = document.querySelector(currentStep.element);
            if (el) {
              resizeObserver = new ResizeObserver(() => {
                if (driverRef.current) {
                  driverRef.current.refresh();
                }
              });
              resizeObserver.observe(el);
            }
          }
        },
        onDestroyed: () => {
          if (inputListener) {
            inputListener.element?.removeEventListener('input', inputListener.handler);
          }
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
          if (driverRef.current?._keydownHandler) {
            document.removeEventListener('keydown', driverRef.current._keydownHandler);
          }
          markAsSeen();
        },
        steps: availableSteps,
      });

      // Add Enter key handler
      const handleKeyDown = (e) => {
        if (e.key === 'Enter' && driverRef.current) {
          e.preventDefault();
          // Check if current step requires input validation
          const currentStep = availableSteps[driverRef.current.getActiveIndex()];
          if (currentStep?.requiresInput) {
            const input = document.querySelector(currentStep.inputSelector);
            if (!input || input.value.trim().length < 2) {
              return; // Block if input validation fails
            }
          }
          driverRef.current.moveNext();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      driverRef.current._keydownHandler = handleKeyDown;

      driverRef.current.drive();
    }, 800);
  }, [hasSeen, markAsSeen]);

  useEffect(() => {
    return () => {
      if (driverRef.current) {
        if (driverRef.current._keydownHandler) {
          document.removeEventListener('keydown', driverRef.current._keydownHandler);
        }
        driverRef.current.destroy();
      }
    };
  }, []);

  return { startTutorial, resetTutorial, hasSeen };
}
