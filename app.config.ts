import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Sayarty",
  slug: "sayarty",
  android: {
    package: "com.ahmed486.sayarty"
  },
  extra: {
    ...config.extra,
    apiBaseUrl: "https://sayarty.store",
    EXPO_PUBLIC_API_BASE_URL: "https://sayarty.store",
    EXPO_PUBLIC_OAUTH_SERVER_URL: "https://sayarty.store",
    eas: {
      projectId: "ec60c506-5ec0-44c5-aff7-4b238b5889eb"
    }
  },
});
