
const fs = require('fs');
const path = require('path');

function loadLocalEnvIfNeeded() {
  if (process.env.GOOGLE_MAPS_ANDROID_API_KEY) {
    return;
  }

  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContents = fs.readFileSync(envPath, 'utf8');

  for (const line of envContents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
}

module.exports = ({ config }) => {
  loadLocalEnvIfNeeded();

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
