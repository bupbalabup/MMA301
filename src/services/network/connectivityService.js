import {
  INTERNET_CHECK_TIMEOUT_MS,
  INTERNET_CHECK_URLS,
} from '../../constants/network';

export async function checkInternetConnection() {
  const probes = INTERNET_CHECK_URLS.map((url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      INTERNET_CHECK_TIMEOUT_MS
    );

    return fetch(url, {
      cache: 'no-store',
      method: 'GET',
      signal: controller.signal,
    })
      .then((response) => response.ok || response.status === 204)
      .catch(() => false)
      .finally(() => clearTimeout(timeoutId));
  });

  const results = await Promise.all(probes);
  return results.some(Boolean);
}
