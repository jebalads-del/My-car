import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Sayarty",
  slug: "sayarty",
  extra: {
    ...config.extra,
    apiBaseUrl: "https://sayarty.store",
    EXPO_PUBLIC_API_BASE_URL: "https://sayarty.store",
    EXPO_PUBLIC_OAUTH_SERVER_URL: "https://sayarty.store",
  },
});
