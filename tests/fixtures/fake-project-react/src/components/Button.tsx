import {useTranslation} from 'react-i18next';

export function Button({onClick}: {onClick: () => void}) {
    const {t} = useTranslation('Button');
    return (
        <button onClick={onClick}>
            {t('confirm')}
            {t('cancel')}
        </button>
    );
}
