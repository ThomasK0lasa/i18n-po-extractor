import {t} from '../i18n';

export function errorHandler(err, req, res, next) {
    if (err.status === 404) {
        return res.status(404).json({message: t('not_found')});
    }
    if (err.status === 403) {
        return res.status(403).json({message: t('forbidden')});
    }
    return res.status(500).json({message: t('internal_error')});
}
