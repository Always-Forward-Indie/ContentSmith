// @ts-nocheck
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export default getRequestConfig(async ({ locale }) => {
  // Validate locale and provide fallback
  const validLocales = ['en', 'ru'];
  const validatedLocale = validLocales.includes(locale) ? locale : 'en';
  
  try {
    return {
      locale: validatedLocale,
      messages: (await import(`../../messages/${validatedLocale}.json`)).default
    };
  } catch (error) {
    // Fallback to English if locale file not found
    return {
      locale: 'en',
      messages: (await import(`../../messages/en.json`)).default
    };
  }
});
