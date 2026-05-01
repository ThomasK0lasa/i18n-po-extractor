import {t} from '../../i18n';

export function formatCurrency(amount: number, currency: string): string {
    if (isNaN(amount)) return t('currency_invalid');
    return `${t('currency_symbol')}${amount.toFixed(2)}`;
}
