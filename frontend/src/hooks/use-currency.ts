import { useSettings } from './use-settings';

export function useCurrency() {
  const { data: settings } = useSettings();
  const currency = settings?.currency || 'HTG';

  function formatAmount(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 ' + currency;
    return num.toLocaleString('fr-FR') + ' ' + currency;
  }

  return { currency, formatAmount };
}
