'use client';

import { useQuery } from '@tanstack/react-query';
import { getSurveys } from '@utils/surveys';
import { clientRequest } from '@utils/clientRequest';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';
import { queryKeys } from './queryKeys';

type UseSurveysQueryParams = {
  limit?: number;
  initialData?: SanitizedCPXSurvey[] | null;
};

export function useSurveysQuery({
  limit = 50,
  initialData,
}: UseSurveysQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.surveys.list(limit),
    queryFn: async () => {
      const surveys = await getSurveys({ request: clientRequest, limit });

      if (!surveys) {
        throw new Error('Failed to load surveys');
      }

      return surveys;
    },
    initialData: initialData ?? undefined,
  });
}
