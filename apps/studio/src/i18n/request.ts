import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Layout handles message loading, so we return minimal config
  return {
    locale: locale || 'en',
    messages: {}
  };
});
