import {t} from '../../i18n';

export function validateEmail(email: string): string | null {
    if (!email) return t('validation_email_required');
    if (!email.includes('@')) return t('validation_email_invalid');
    return null;
}
