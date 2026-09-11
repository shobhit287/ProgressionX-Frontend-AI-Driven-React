import { useRef, useState } from 'react';
import { AlertCircle, Check, DatabaseBackup, Download, ShieldCheck, ShieldAlert, Upload } from 'lucide-react';
import {
  useDownloadBackup,
  useRequestPersistentStorage,
  useRestoreBackup,
  useStoragePersisted,
} from '@/api/export';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/** Backup & restore. Everything lives in this phone's browser storage, so a
 *  downloaded JSON file is the only copy that survives a lost phone or a
 *  "clear site data" tap. */
export default function BackupPage() {
  const download = useDownloadBackup();
  const restore = useRestoreBackup();
  const { data: persisted } = useStoragePersisted();
  const requestPersist = useRequestPersistentStorage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<File | null>(null);

  const handleDownload = async () => {
    setError(null);
    setSuccess(null);
    try {
      const data = await download.mutateAsync();
      setSuccess(
        `Saved ${data.sessions.length} sessions, ${data.sets.length} sets and ${data.weightLogs.length} weight logs.`,
      );
    } catch (e) {
      setError((e as Error).message || 'Could not create the backup.');
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setError(null);
    setSuccess(null);
    try {
      const summary = await restore.mutateAsync(confirmRestore);
      setSuccess(
        `Restored ${summary.sessions} sessions, ${summary.sets} sets, ${summary.splits} splits and ${summary.weightLogs} weight logs.`,
      );
    } catch (e) {
      const err = e as { userMessage?: string; message?: string };
      setError(err.userMessage || err.message || 'Could not restore that file.');
    } finally {
      setConfirmRestore(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DatabaseBackup className="text-[#6366f1]" size={26} />
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
      </div>

      <p className="text-sm text-text-muted">
        Your data is stored only on this device. Download a backup now and then, and keep it
        somewhere safe (Drive, email to yourself, a PC).
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
          <Check size={16} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Download size={18} className="text-primary" />
          <p className="font-semibold">Download backup</p>
        </div>
        <p className="text-sm text-text-muted">
          One JSON file with your profile, splits, every session and set, weight logs and diet plan.
          Your AI key is <span className="text-text">not</span> included.
        </p>
        <Button className="w-full" loading={download.isPending} onClick={() => void handleDownload()}>
          <Download size={16} /> Download backup
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-primary" />
          <p className="font-semibold">Restore from backup</p>
        </div>
        <p className="text-sm text-text-muted">
          Replaces <span className="text-text">everything</span> on this device with the file's contents.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setConfirmRestore(f);
          }}
        />
        {!confirmRestore ? (
          <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
            Choose backup file
          </Button>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <p className="text-sm">
              Restore <span className="font-medium text-text">{confirmRestore.name}</span>? Current
              data on this device will be overwritten.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmRestore(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" loading={restore.isPending} onClick={() => void handleRestore()}>
                Overwrite & restore
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          {persisted ? (
            <ShieldCheck size={18} className="text-success" />
          ) : (
            <ShieldAlert size={18} className="text-warning" />
          )}
          <p className="font-semibold">Storage protection</p>
        </div>
        {persisted ? (
          <p className="text-sm text-text-muted">
            The browser has agreed not to evict this app's data under storage pressure. A backup
            is still the only protection against a lost or reset phone.
          </p>
        ) : (
          <>
            <p className="text-sm text-text-muted">
              Not yet marked persistent. Installing the app to your home screen usually grants
              this automatically; you can also ask directly.
            </p>
            <Button
              variant="secondary"
              className="w-full"
              loading={requestPersist.isPending}
              onClick={() => requestPersist.mutate()}
            >
              Request persistent storage
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
