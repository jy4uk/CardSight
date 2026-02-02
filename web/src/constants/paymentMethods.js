import { DollarSign, CreditCard } from 'lucide-react';

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: DollarSign },
  { id: 'credit_card', label: 'Card', icon: CreditCard },
  { id: 'venmo', label: 'Venmo', icon: CreditCard },
  { id: 'zelle', label: 'Zelle', icon: CreditCard },
  { id: 'cashapp', label: 'CashApp', icon: CreditCard },
];
