import { useEffect, useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TUTORIAL_SEEN_KEY = 'cardsight_tutorial_seen';

// Define the tutorial steps with page navigation
const getTutorialSteps = (isAuthenticated, onNavigate) => {
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
        element: '[data-tutorial="nav-tabs"]',
        popover: {
          title: '📍 Navigation',
          description: 'These tabs let you switch between different sections. Let\'s explore each one!',
          side: 'bottom',
          align: 'start',
        },
        onHighlightStarted: () => onNavigate('inventory'),
      },
      {
        element: '[data-tutorial="search-filter"]',
        popover: {
          title: '🔍 Search & Filter',
          description: 'Find cards instantly by name, set, or barcode. Use filters for game, condition, or price range.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tutorial="cart-button"]',
        popover: {
          title: '🛒 Shopping Cart',
          description: 'Scan barcodes or click cards to add them to the cart. Complete sales with cash or card.',
          side: 'bottom',
          align: 'end',
        },
      },
      // === INTAKE PAGE ===
      {
        element: '[data-tutorial="intake-page"]',
        popover: {
          title: '📦 Intake Page',
          description: 'This is your intake hub for adding new inventory. Let\'s explore each section!',
          side: 'top',
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
        element: '[data-tutorial="insights-page"]',
        popover: {
          title: '📊 Insights Page',
          description: 'Track your business performance with analytics, sales data, and card show management.',
          side: 'top',
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
      // === BARCODES PAGE ===
      {
        element: '[data-tutorial="barcodes-page"]',
        popover: {
          title: '🏷️ Barcode Generator',
          description: 'Generate and print barcode labels for your inventory. Great for card shows!',
          side: 'top',
          align: 'center',
        },
        onHighlightStarted: () => onNavigate('barcodes'),
      },
      // === BACK TO INVENTORY & FINISH ===
      {
        element: '[data-tutorial="settings-button"]',
        popover: {
          title: '⚙️ Settings',
          description: 'Update your profile, manage your account, and restart this tutorial anytime.',
          side: 'bottom',
          align: 'end',
        },
        onHighlightStarted: () => onNavigate('inventory'),
      }
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
      },
      {
        element: '[data-tutorial="cart-button"]',
        popover: {
          title: '🛒 Shopping Cart',
          description: 'Add cards you want to purchase to your cart. The seller can then complete the transaction.',
          side: 'bottom',
          align: 'end',
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

      driverRef.current.drive();
    }, 500);
  }, [isAuthenticated, hasSeen, markAsSeen, handleNavigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
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
