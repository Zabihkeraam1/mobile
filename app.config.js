const baseUrl = process.env.EXPO_BASE_URL || "";

module.exports = ({ config }) => ({
  ...config,
  // keep whatever is already in app.json (Expo merges it)
  experiments: {
    ...(config.experiments ?? {}),
    baseUrl,
  },
});
