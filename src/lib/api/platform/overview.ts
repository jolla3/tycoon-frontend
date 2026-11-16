import { apiClient } from '../client';
import type { PlatformOverview } from './types';

export const overviewApi = { get: () => apiClient.get<PlatformOverview>('/platform/overview') };
