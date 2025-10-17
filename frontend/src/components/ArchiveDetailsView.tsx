import { Archive } from '../types/api';
import { useArchiveContents, useRefreshArchiveStats, useArchive } from '../services/archives';
import { FileTreeBrowser } from './FileTreeBrowser';
import { useState } from 'react';

interface ArchiveDetailsViewProps {
  archive: Archive;
  onClose: () => void;
}

export function ArchiveDetailsView({ archive: initialArchive, onClose }: ArchiveDetailsViewProps) {
  const { data: contents, isLoading, error } = useArchiveContents(initialArchive.id, '');
  const { data: freshArchive } = useArchive(initialArchive.id);
  const refreshStatsMutation = useRefreshArchiveStats();
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  
  // Use fresh archive data from the query, fallback to initial prop
  const archive = freshArchive || initialArchive;
  
  // Ensure contents is always an array to prevent map errors
  const fileList = Array.isArray(contents) ? contents : [];

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const getCompressionRatio = () => {
    if (!archive.original_size || !archive.compressed_size) return 'N/A';
    const ratio = ((archive.original_size - archive.compressed_size) / archive.original_size) * 100;
    return `${Math.round(ratio)}%`;
  };

  const getDeduplicationRatio = () => {
    if (!archive.compressed_size || !archive.deduplicated_size) return 'N/A';
    const ratio = ((archive.compressed_size - archive.deduplicated_size) / archive.compressed_size) * 100;
    return `${Math.round(ratio)}%`;
  };

  const handleRefreshStats = async () => {
    try {
      await refreshStatsMutation.mutateAsync(archive.id);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  };

  const hasStats = archive.original_size || archive.compressed_size || archive.deduplicated_size;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Archive Details</h3>
            <p className="text-sm text-gray-600 mt-1">{archive.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {!hasStats && (
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mr-2">
                No stats available
              </div>
            )}
            <button
              onClick={handleRefreshStats}
              disabled={refreshStatsMutation.isPending}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="Fetch detailed statistics from Borg"
            >
              {refreshStatsMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : refreshSuccess ? (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Updated!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Stats
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Archive Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Original Size</p>
            <p className="text-lg font-semibold">{formatSize(archive.original_size || 0)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Files</p>
            <p className="text-lg font-semibold">{archive.nfiles?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Compression</p>
            <p className="text-lg font-semibold">{getCompressionRatio()}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Deduplication</p>
            <p className="text-lg font-semibold">{getDeduplicationRatio()}</p>
          </div>
        </div>

        {/* Archive Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Archive Information</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Created:</strong> {formatDate(archive.created_at)}</p>
              <p><strong>Started:</strong> {formatDate(archive.start_time || null)}</p>
              <p><strong>Completed:</strong> {formatDate(archive.end_time || null)}</p>
              {archive.hostname && <p><strong>Host:</strong> {archive.hostname}</p>}
              {archive.username && <p><strong>User:</strong> {archive.username}</p>}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Storage Details</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Compressed Size:</strong> {formatSize(archive.compressed_size || 0)}</p>
              <p><strong>Deduplicated Size:</strong> {formatSize(archive.deduplicated_size || 0)}</p>
              {archive.borg_id && <p><strong>Borg ID:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{archive.borg_id}</code></p>}
            </div>
          </div>
        </div>

        {archive.comment && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Comment</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg italic">"{archive.comment}"</p>
          </div>
        )}

        {/* File Browser */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium text-gray-900">Archive Contents</h4>
            <span className="text-xs text-gray-500">Browse files in this archive</span>
          </div>

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">Failed to load archive contents: {error.message}</p>
            </div>
          ) : (
            <FileTreeBrowser files={fileList} isLoading={isLoading} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}