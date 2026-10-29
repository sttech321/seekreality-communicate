export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.afterlifeinstitute.org/api').replace(/\/$/, '');
export const COMMUNICATE_API_URL = `${API_BASE_URL}/apps/communicate`;
export const LESSON_ASSET_BASE_URL = API_BASE_URL.replace(/\/api$/, '/');
