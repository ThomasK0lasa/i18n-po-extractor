import {t} from '../i18n';

export function validateUserInput(data) {
    const errors = [];
    if (!data.email) errors.push(t('email_required'));
    if (!data.password) errors.push(t('password_required'));
    if (data.password && data.password.length < 8) errors.push(t('password_too_short'));
    return errors;
}
