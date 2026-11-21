import {
  defineAppConfig,
  envString,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import type { AppI18nConfig } from '@nocobase/app-server/i18n';

const i18n: AppConfigFactory<AppI18nConfig> = defineAppConfig({
  // Dương Sinh staff work in Vietnamese; English and Chinese stay in the language menu.
  defaults: { defaultLocale: 'vi-VN' },
  env: {
    APP_DEFAULT_LOCALE: envString('defaultLocale', {
      description:
        'The language the application starts in, such as vi-VN or en-US.',
    }),
  },
});

export default i18n;
