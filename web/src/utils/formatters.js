export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatPrice = (price, showCents = true) => {
  const num = parseFloat(price) || 0;
  return showCents ? num.toFixed(2) : Math.round(num).toString();
};

export const formatCurrency = (price) => {
  const num = parseFloat(price) || 0;
  return `$${num.toFixed(2)}`;
};

export const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const truncate = (str, maxLength = 50) => {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};
