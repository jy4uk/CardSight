import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContextNew'
import { CartProvider } from './context/CartContext'
import { PendingPurchaseProvider } from './context/PendingPurchaseContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <PendingPurchaseProvider>
          <App />
        </PendingPurchaseProvider>
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
)
