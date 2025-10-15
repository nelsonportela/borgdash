import { useState } from 'react';
import { RepositoryCreate } from '../types/api';

interface RepositoryFormProps {
  onSubmit: (data: RepositoryCreate) => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
}

export function RepositoryForm({ 
  onSubmit, 
  onCancel, 
  loading = false,
  error 
}: RepositoryFormProps) {
  const [formData, setFormData] = useState<RepositoryCreate>({
    name: '',
    url: '',
    repo_type: 'local',
    encryption_mode: 'repokey-blake2',
    ssh_auth_method: 'key',
    remote_path: 'borg-1.4',
    passphrase: ''
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    
    // Automatically set SSH key path for SSH repositories with key auth
    const submitData = { ...formData };
    if (formData.repo_type === 'ssh' && formData.ssh_auth_method === 'key') {
      submitData.ssh_key_path = '/app/host_keys/ssh_key';
    }
    
    onSubmit(submitData);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Create New Repository</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Repository Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repository Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="e.g., my-backup-repo"
          />
        </div>

        {/* Repository Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repository Type *
          </label>
          <select
            name="repo_type"
            value={formData.repo_type}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="local">Local Directory</option>
            <option value="ssh">Remote SSH</option>
          </select>
        </div>

        {/* Repository URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repository URL *
          </label>
          <input
            type="text"
            name="url"
            value={formData.url}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder={formData.repo_type === 'ssh' 
              ? "ssh://user@server:port/path/to/repo" 
              : "/path/to/local/repo"}
          />
        </div>

        {/* SSH Authentication Method - only for SSH repositories */}
        {formData.repo_type === 'ssh' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SSH Authentication Method *
            </label>
            <select
              name="ssh_auth_method"
              value={formData.ssh_auth_method || 'key'}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="key">Private Key</option>
              <option value="password">Password</option>
            </select>
          </div>
        )}

        {/* Encryption Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Encryption Mode
          </label>
          <select
            name="encryption_mode"
            value={formData.encryption_mode}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">None (not recommended)</option>
            <option value="repokey">Repository Key</option>
            <option value="repokey-blake2">Repository Key (BLAKE2)</option>
            <option value="keyfile">Key File</option>
            <option value="keyfile-blake2">Key File (BLAKE2)</option>
          </select>
        </div>

        {/* SSH Key Path is automatically set to /app/host_keys/ssh_key for key auth */}

        {/* SSH Password - only for SSH repositories with password auth */}
        {formData.repo_type === 'ssh' && formData.ssh_auth_method === 'password' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SSH Password *
            </label>
            <input
              type="password"
              name="ssh_password"
              value={formData.ssh_password || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="SSH user password"
            />
          </div>
        )}

        {/* Remote Path - only for SSH repositories */}
        {formData.repo_type === 'ssh' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remote Borg Path
            </label>
            <input
              type="text"
              name="remote_path"
              value={formData.remote_path || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="borg-1.4"
            />
          </div>
        )}

        {/* Passphrase - only if encryption is enabled */}
        {formData.encryption_mode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository Passphrase *
            </label>
            <input
              type="password"
              name="passphrase"
              value={formData.passphrase || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="Enter a strong passphrase"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
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
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Repository'}
          </button>
        </div>
      </form>
    </div>
  );
}