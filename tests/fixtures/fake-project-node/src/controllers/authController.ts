import {t} from '../i18n';

export async function login(req, res) {
    const {email, password} = req.body;
    const user = await authenticate(email, password);
    if (!user) {
        return res.status(401).json({message: t('invalid_credentials')});
    }
    return res.json({token: generateToken(user), message: t('login_success')});
}

export async function logout(req, res) {
    await invalidateToken(req.token);
    return res.json({message: t('logout_success')});
}

export async function forgotPassword(req, res) {
    await sendResetEmail(req.body.email);
    return res.json({message: t('reset_email_sent')});
}
