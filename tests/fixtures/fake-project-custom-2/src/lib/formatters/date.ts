import {t} from '../../i18n';

export function formatRelativeDate(date: Date): string {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t('date_today');
    if (days === 1) return t('date_yesterday');
    return t('date_days_ago');
}
