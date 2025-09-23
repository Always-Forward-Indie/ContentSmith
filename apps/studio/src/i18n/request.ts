import { getRequestConfig } from 'next-intl/server';
import { loadMessages } from './loader';
import { Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Load messages for the current locale with fallback to 'en'
  const currentLocale = (locale || 'en') as Locale;
  const messages = await loadMessages(currentLocale);
  
  return {
    locale: currentLocale,
    messages
  };
});
