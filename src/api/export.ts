import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export interface ExportSplitOption {
  id: string;
  name: string;
  day: string;
}

export interface ExportFiltersResponse {
  splits: ExportSplitOption[];
  exercises: string[];
}

export interface ExportPdfPayload {
  startDate: string;
  endDate: string;
  splitId?: string;
  exerciseName?: string;
}

export const exportKeys = {
  filters: ['export', 'filters'] as const,
};

export function useExportFilters() {
  return useQuery({
    queryKey: exportKeys.filters,
    queryFn: async () => {
      const { data } = await apiClient.get<ExportFiltersResponse>('/export/filters');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface ExportPdfResponse {
  message: string;
  email: string;
}

export function useExportPdf() {
  return useMutation({
    mutationFn: async (payload: ExportPdfPayload) => {
      const { data } = await apiClient.post<ExportPdfResponse>('/export/pdf', payload);
      return data;
    },
  });
}
