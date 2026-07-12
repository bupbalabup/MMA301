import {
  INTERNET_CHECK_TIMEOUT_MS,
  INTERNET_CHECK_URL,
} from '../../constants/network';

export async function checkInternetConnection() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INTERNET_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(INTERNET_CHECK_URL, {
      cache: 'no-store',
      method: 'GET',
      signal: controller.signal,
    });

    return response.ok || response.status === 204;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

