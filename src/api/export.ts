// Backup & restore hooks. The old server-side PDF export is gone; this is
// the full-database JSON backup that keeps on-device data safe.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as backup from '@/local/backup';

export const backupKeys = {
  persisted: ['backup', 'persisted'] as const,
};

export function useStoragePersisted() {
  return useQuery({
    queryKey: backupKeys.persisted,
    queryFn: () => backup.isStoragePersisted(),
    staleTime: 60 * 1000,
  });
}

export function useRequestPersistentStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => backup.requestPersistentStorage(),
    onSuccess: (persisted) => queryClient.setQueryData(backupKeys.persisted, persisted),
  });
}

/** Serialises the database and hands the browser a .json download. */
export function useDownloadBackup() {
  return useMutation({
    mutationFn: async () => {
      const data = await backup.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.backupFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return data;
    },
  });
}

/** Replaces everything on the device with the contents of a backup file. */
export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
      return backup.importBackup(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
