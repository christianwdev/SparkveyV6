import { createSearchParamsCache } from 'nuqs/server';
import { tasksSearchParams } from './parsers';

export const tasksSearchParamsCache = createSearchParamsCache(tasksSearchParams);
