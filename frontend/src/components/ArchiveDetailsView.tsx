import { Archive } from '../types/api';
import { useArchiveContents } from '../services/archives';
import { FileTreeBrowser } from './FileTreeBrowser';

interface ArchiveDetailsViewProps {
  archive: Archive;
  onClose: () => void;
}

export function ArchiveDetailsView({ archive, onClose }: ArchiveDetailsViewProps) {
  const { data: contents, isLoading, error } = useArchiveContents(archive.id, '');
  
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



  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Archive Details</h3>
            <p className="text-sm text-gray-600 mt-1">{archive.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
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