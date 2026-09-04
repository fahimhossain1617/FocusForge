import { useAppContext } from "../context/AppContext";
import { TRANSLATIONS } from "../i18n/translations";

export function useTranslation() {
  const { state } = useAppContext();
  const lang = (state?.lang as 'en' | 'bn') || 'en';
  
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  return { t, lang };
}
