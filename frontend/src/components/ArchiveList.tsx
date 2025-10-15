import { Archive } from '../types/api';
import { ArchiveProgressTracker } from './ArchiveProgressTracker';

interface ArchiveCardProps {
  archive: Archive;
  repositoryName?: string;
  onDelete?: (archive: Archive) => void;
  onViewDetails?: (archive: Archive) => void;
}

export function ArchiveCard({ 
  archive, 
  repositoryName,
  onDelete, 
  onViewDetails 
}: ArchiveCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getCompressionRatio = () => {
    if (!archive.original_size || !archive.compressed_size) return null;
    const ratio = ((archive.original_size - archive.compressed_size) / archive.original_size) * 100;
    return Math.round(ratio);
  };

  const getDeduplicationRatio = () => {
    if (!archive.compressed_size || !archive.deduplicated_size) return null;
    const ratio = ((archive.compressed_size - archive.deduplicated_size) / archive.compressed_size) * 100;
    return Math.round(ratio);
  };

  const getDuration = () => {
    if (!archive.start_time || !archive.end_time) return null;
    const start = new Date(archive.start_time);
    const end = new Date(archive.end_time);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📦</span>
            <h3 className="text-lg font-semibold text-gray-900">{archive.name}</h3>
          </div>
          
          {repositoryName && (
            <div className="mb-2">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {repositoryName}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
            {/* Left column */}
            <div>
              {archive.original_size && (
                <p><strong>Size:</strong> {formatSize(archive.original_size)}</p>
              )}
              {archive.nfiles && (
                <p><strong>Files:</strong> {archive.nfiles.toLocaleString()}</p>
              )}
              {archive.hostname && (
                <p><strong>Host:</strong> {archive.hostname}</p>
              )}
            </div>
            
            {/* Right column */}
            <div>
              {getCompressionRatio() !== null && (
                <p><strong>Compression:</strong> {getCompressionRatio()}%</p>
              )}
              {getDeduplicationRatio() !== null && (
                <p><strong>Deduplication:</strong> {getDeduplicationRatio()}%</p>
              )}
              {getDuration() && (
                <p><strong>Duration:</strong> {getDuration()}</p>
              )}
            </div>
          </div>

          {archive.comment && (
            <div className="mb-3">
              <p className="text-sm text-gray-700 italic">"{archive.comment}"</p>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Created: {formatDate(archive.created_at)}</span>
            {archive.start_time && (
              <span>Started: {formatTimeAgo(archive.start_time)}</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(archive)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            >
              View Details
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(archive)}
              className="px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Progress Tracker for Running Archives */}
      <ArchiveProgressTracker
        archiveId={archive.id}
        archiveName={archive.name}
        isRunning={archive.start_time !== null && archive.end_time === null}
      />
    </div>
  );
}

interface ArchiveListProps {
  archives: Archive[];
  repositoryNames?: { [key: number]: string };
  loading?: boolean;
  error?: string;
  onDelete?: (archive: Archive) => void;
  onViewDetails?: (archive: Archive) => void;
}

export function ArchiveList({ 
  archives, 
  repositoryNames = {},
  loading, 
  error, 
  onDelete, 
  onViewDetails 
}: ArchiveListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-3"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-7 bg-gray-200 rounded w-20"></div>
                <div className="h-7 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-700">
            <h3 className="text-sm font-medium">Error loading archives</h3>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (archives.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No archives yet</h3>
        <p className="text-gray-500">Create your first backup to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {archives.map(archive => (
        <ArchiveCard
          key={archive.id}
          archive={archive}
          repositoryName={repositoryNames[archive.repository_id]}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}