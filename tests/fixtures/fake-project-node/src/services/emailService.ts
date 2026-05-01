import {t} from '../i18n';

export async function sendWelcomeEmail(user) {
    await sendEmail({
        to: user.email,
        subject: t('welcome_email_subject'),
        body: t('welcome_email_body'),
    });
}

export async function sendPasswordResetEmail(user, token) {
    await sendEmail({
        to: user.email,
        subject: t('password_reset_subject'),
        body: t('password_reset_body'),
    });
}
