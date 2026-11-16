import { apiClient } from '../client';
import type { PlatformHealth } from './types';

export const healthApi = { get: () => apiClient.get<PlatformHealth>('/platform/health') };
