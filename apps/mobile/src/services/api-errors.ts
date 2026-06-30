/** Map API client failures to stable error codes for services/UI. */
export type ApiErrorCode = 'network_unavailable' | 'session_expired' | 'api_error';

export function resolveApiErrorCode(status: number): ApiErrorCode {
  if (status === 0) return 'network_unavailable';
  if (status === 401) return 'session_expired';
  return 'api_error';
}

export function apiErrorMessage(code: ApiErrorCode, fallback?: string): string {
  switch (code) {
    case 'network_unavailable':
      return 'Нет подключения к серверу. Проверьте сеть.';
    case 'session_expired':
      return 'Сессия истекла. Войдите снова.';
    default:
      return fallback ?? 'Не удалось выполнить запрос.';
  }
}
