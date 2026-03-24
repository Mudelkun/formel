import { useSettings } from './use-settings';

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format a number with thousand separators (no currency suffix) */
export function formatNumber(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return numberFormatter.format(num);
}

export function useCurrency() {
  const { data: settings } = useSettings();
  const currency = settings?.currency || 'HTG';

  /** Format a number with thousand separators + currency suffix */
  function formatAmount(amount: number | string): string {
    return formatNumber(amount) + ' ' + currency;
  }

  return { currency, formatAmount, formatNumber };
}
