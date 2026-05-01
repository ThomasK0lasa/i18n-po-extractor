import {useTranslation} from 'react-i18next';

export function Modal({title}: {title: string}) {
    const {t} = useTranslation('Modal');
    return (
        <div>
            <h2>{t('title')}</h2>
            <p>{t('closeMessage')}</p>
            <button>{t('close')}</button>
            <button>{t('save')}</button>
        </div>
    );
}
