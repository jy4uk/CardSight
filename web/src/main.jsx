import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContextNew'
import { CartProvider } from './context/CartContext'
import { PendingPurchaseProvider } from './context/PendingPurchaseContext'
import { SavedDealsProvider } from './context/SavedDealsContext'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <PendingPurchaseProvider>
            <SavedDealsProvider>
              <App />
              <Analytics />
            </SavedDealsProvider>
          </PendingPurchaseProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
