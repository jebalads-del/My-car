const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { createApiProxy } = require("./scripts/api-proxy.cjs");

const config = getDefaultConfig(__dirname);

const nativewindConfig = withNativeWind(config, {
  input: "./global.css",
});
const originalEnhance = nativewindConfig.server?.enhanceMiddleware;
nativewindConfig.server = {
  ...nativewindConfig.server,
  enhanceMiddleware(middleware, server) {
    return createApiProxy(originalEnhance ? originalEnhance(middleware, server) : middleware);
  },
};
module.exports = nativewindConfig;
