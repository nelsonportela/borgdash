import { useState } from 'react';
import { RepositoryImport } from '../types/api';

interface ImportRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: RepositoryImport) => Promise<void>;
}

export const ImportRepositoryModal: React.FC<ImportRepositoryModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [formData, setFormData] = useState<RepositoryImport>({
    name: '',
    url: '',
    repo_type: 'local',
    passphrase: '',
    ssh_key_path: '',
    ssh_password: '',
    ssh_auth_method: 'key',
    remote_path: 'borg-1.4',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onImport(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        url: '',
        repo_type: 'local',
        passphrase: '',
        ssh_key_path: '',
        ssh_password: '',
        ssh_auth_method: 'key',
        remote_path: 'borg-1.4',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to import repository');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Import Existing Repository</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Repository Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Repository Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              placeholder="My Existing Backup"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-gray-500">Friendly name for this repository</p>
          </div>

          {/* Repository Type */}
          <div>
            <label htmlFor="repo_type" className="block text-sm font-medium text-gray-700 mb-1">
              Repository Type *
            </label>
            <select
              id="repo_type"
              required
              value={formData.repo_type}
              onChange={(e) => setFormData({ ...formData, repo_type: e.target.value as 'local' | 'ssh' })}
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="local">Local</option>
              <option value="ssh">SSH</option>
            </select>
          </div>

          {/* Repository URL */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Repository Location *
            </label>
            <input
              type="text"
              id="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              placeholder={formData.repo_type === 'local' ? '/path/to/repo' : 'user@host:/path/to/repo'}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.repo_type === 'local' 
                ? 'Full path to the local Borg repository' 
                : 'SSH path in format: user@host:/path/to/repo'}
            </p>
          </div>

          {/* Passphrase */}
          <div>
            <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-1">
              Repository Passphrase
            </label>
            <input
              type="password"
              id="passphrase"
              value={formData.passphrase}
              onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              placeholder="Enter passphrase if repository is encrypted"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty if repository is not encrypted
            </p>
          </div>

          {/* SSH-specific fields */}
          {formData.repo_type === 'ssh' && (
            <>
              {/* SSH Auth Method */}
              <div>
                <label htmlFor="ssh_auth_method" className="block text-sm font-medium text-gray-700 mb-1">
                  SSH Authentication Method
                </label>
                <select
                  id="ssh_auth_method"
                  value={formData.ssh_auth_method}
                  onChange={(e) => setFormData({ ...formData, ssh_auth_method: e.target.value as 'key' | 'password' })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="key">SSH Key</option>
                  <option value="password">Password</option>
                </select>
              </div>

              {/* SSH Key Path or Password */}
              {formData.ssh_auth_method === 'key' ? (
                <div>
                  <label htmlFor="ssh_key_path" className="block text-sm font-medium text-gray-700 mb-1">
                    SSH Key Path
                  </label>
                  <input
                    type="text"
                    id="ssh_key_path"
                    value={formData.ssh_key_path}
                    onChange={(e) => setFormData({ ...formData, ssh_key_path: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                    placeholder="/app/host_keys/ssh_key"
                    disabled={isSubmitting}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Path to SSH private key (leave empty to use default)
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="ssh_password" className="block text-sm font-medium text-gray-700 mb-1">
                    SSH Password
                  </label>
                  <input
                    type="password"
                    id="ssh_password"
                    value={formData.ssh_password}
                    onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                    placeholder="Enter SSH password"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Remote Path */}
              <div>
                <label htmlFor="remote_path" className="block text-sm font-medium text-gray-700 mb-1">
                  Remote Borg Binary Path
                </label>
                <input
                  type="text"
                  id="remote_path"
                  value={formData.remote_path}
                  onChange={(e) => setFormData({ ...formData, remote_path: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  placeholder="borg-1.4"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Path to borg binary on remote server
                </p>
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Import Process</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>This will:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Validate access to the repository</li>
                    <li>Import all existing archives</li>
                    <li>Add the repository to BorgDash for management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Repository
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
