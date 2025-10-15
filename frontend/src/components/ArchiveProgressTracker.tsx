import { useArchiveProgress } from '../services/archives';

interface ArchiveProgressProps {
  archiveId: number;
  archiveName: string;
  isRunning: boolean;
}

export function ArchiveProgressTracker({ 
  archiveId, 
  isRunning 
}: ArchiveProgressProps) {
  const { data: progress, isLoading } = useArchiveProgress(archiveId, isRunning);

  if (!isRunning || !progress) {
    return null;
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-blue-900">Backup in Progress</h4>
        <span className="text-xs text-blue-700">{Math.round(progress.progress * 100)}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.progress * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
        <div>
          <div>Files: {progress.nfiles.toLocaleString()}</div>
          {progress.original_size > 0 && (
            <div>Size: {formatSize(progress.original_size)}</div>
          )}
        </div>
        <div>
          <div>Time: {formatTime(progress.time)}</div>
          {progress.path && (
            <div className="truncate" title={progress.path}>
              Current: {progress.path}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Updating...</span>
        </div>
      )}
    </div>
  );
}