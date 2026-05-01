import {t} from '../../i18n';

export function validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (!password) errors.push(t('validation_password_required'));
    if (password.length < 8) errors.push(t('validation_password_too_short'));
    if (!/[A-Z]/.test(password)) errors.push(t('validation_password_no_uppercase'));
    return errors;
}
