import { useState } from 'react';
import { Repository, ArchiveCreate } from '../types/api';

interface ArchiveFormProps {
  repositories: Repository[];
  selectedRepositoryId?: number;
  onSubmit: (data: ArchiveCreate) => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
}

export function ArchiveForm({ 
  repositories,
  selectedRepositoryId,
  onSubmit, 
  onCancel, 
  loading = false,
  error 
}: ArchiveFormProps) {
  const [formData, setFormData] = useState<ArchiveCreate>({
    repository_id: selectedRepositoryId || (repositories.length > 0 ? repositories[0].id : 0),
    name: `backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
    comment: '',
    paths: ['/home'],
    exclude_patterns: [
      '*.tmp',
      '*.log',
      '*/tmp/*',
      '*/cache/*',
      '*/.cache/*',
      '*/node_modules/*',
      '*/__pycache__/*'
    ],
    compression: 'lz4',
    checkpoint_interval: 1800
  });

  const [pathsInput, setPathsInput] = useState(formData.paths.join('\n'));
  const [excludePatternsInput, setExcludePatternsInput] = useState(formData.exclude_patterns?.join('\n') || '');

  const handleSubmit = (e: any) => {
    e.preventDefault();
    
    // Parse paths and exclude patterns from textarea inputs
    const paths = pathsInput.split('\n').filter(path => path.trim().length > 0);
    const exclude_patterns = excludePatternsInput
      .split('\n')
      .filter(pattern => pattern.trim().length > 0);
    
    const submitData = {
      ...formData,
      paths,
      exclude_patterns: exclude_patterns.length > 0 ? exclude_patterns : undefined
    };
    
    onSubmit(submitData);
  };

  const handleChange = (e: any) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const compressionOptions = [
    { value: 'none', label: 'None (fastest, largest)' },
    { value: 'lz4', label: 'LZ4 (fast, good compression)' },
    { value: 'zlib', label: 'ZLIB (moderate speed and compression)' },
    { value: 'lzma', label: 'LZMA (slow, best compression)' },
    { value: 'zstd', label: 'ZSTD (good speed and compression)' }
  ];

  const getRepositoryDisplayName = (repository: Repository) => {
    return `${repository.name} (${repository.repo_type})`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Create New Backup</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Repository Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repository *
          </label>
          <select
            name="repository_id"
            value={formData.repository_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {repositories.filter(repo => repo.status === 'initialized').map(repository => (
              <option key={repository.id} value={repository.id}>
                {getRepositoryDisplayName(repository)}
              </option>
            ))}
          </select>
          {repositories.filter(repo => repo.status === 'initialized').length === 0 && (
            <p className="mt-1 text-sm text-red-600">
              No initialized repositories available. Please create and initialize a repository first.
            </p>
          )}
        </div>

        {/* Archive Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Archive Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="backup-2025-01-01"
          />
          <p className="mt-1 text-sm text-gray-500">
            Use a descriptive name for this backup archive
          </p>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comment
          </label>
          <input
            type="text"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional description of this backup"
          />
        </div>

        {/* Paths to Backup */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paths to Backup *
          </label>
          <textarea
            value={pathsInput}
            onChange={(e) => setPathsInput(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="/home&#10;/etc&#10;/var/www"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter one path per line. These directories will be included in the backup.
          </p>
        </div>

        {/* Exclude Patterns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exclude Patterns
          </label>
          <textarea
            value={excludePatternsInput}
            onChange={(e) => setExcludePatternsInput(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="*.tmp&#10;*.log&#10;*/cache/*&#10;*/node_modules/*"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter patterns to exclude from backup, one per line. Supports shell-style wildcards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Compression */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compression Method
            </label>
            <select
              name="compression"
              value={formData.compression}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {compressionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Checkpoint Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Checkpoint Interval (seconds)
            </label>
            <input
              type="number"
              name="checkpoint_interval"
              value={formData.checkpoint_interval}
              onChange={handleChange}
              min="300"
              max="7200"
              step="300"
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              How often to save progress (300-7200 seconds)
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || repositories.filter(repo => repo.status === 'initialized').length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Backup...' : 'Start Backup'}
          </button>
        </div>
      </form>
    </div>
  );
}