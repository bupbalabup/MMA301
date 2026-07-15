
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  if (!googleMapsApiKey) {
    throw new Error(
      'Missing GOOGLE_MAPS_ANDROID_API_KEY environment variable.'
    );
  }

  return {
    ...config,

    android: {
      ...config.android,

      config: {
        ...config.android?.config,

        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
