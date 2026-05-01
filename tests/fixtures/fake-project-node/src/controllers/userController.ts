import {t} from '../i18n';

export async function getUser(req, res) {
    const user = await findUser(req.params.id);
    if (!user) {
        return res.status(404).json({message: t('user_not_found')});
    }
    return res.json(user);
}

export async function deleteUser(req, res) {
    await removeUser(req.params.id);
    return res.json({message: t('user_deleted')});
}

export async function updateUser(req, res) {
    const updated = await saveUser(req.body);
    return res.json({message: t('user_updated'), data: updated});
}
