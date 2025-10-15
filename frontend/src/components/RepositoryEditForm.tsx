import { useState } from 'react';
import { Repository, RepositoryUpdate } from '../types/api';
import { useUpdateRepository } from '../services/repositories';

interface RepositoryEditFormProps {
  repository: Repository;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RepositoryEditForm({ repository, onClose, onSuccess }: RepositoryEditFormProps) {
  const [formData, setFormData] = useState<RepositoryUpdate>({
    name: repository.name,
    ssh_key_path: repository.ssh_key_path || '',
    ssh_auth_method: repository.ssh_auth_method as 'key' | 'password' || 'key',
    remote_path: repository.remote_path,
    passphrase: '', // Start empty for security
    is_active: repository.is_active,
  });

  const [showPassword, setShowPassword] = useState(false);
  const updateMutation = useUpdateRepository();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Only send fields that have changed or passphrase if provided
      const updateData: RepositoryUpdate = {};
      
      if (formData.name !== repository.name) updateData.name = formData.name;
      if (formData.ssh_key_path !== repository.ssh_key_path) updateData.ssh_key_path = formData.ssh_key_path;
      if (formData.ssh_auth_method !== repository.ssh_auth_method) updateData.ssh_auth_method = formData.ssh_auth_method;
      if (formData.remote_path !== repository.remote_path) updateData.remote_path = formData.remote_path;
      if (formData.is_active !== repository.is_active) updateData.is_active = formData.is_active;
      
      // Always include passphrase if provided (even if empty to clear it)
      if (formData.passphrase !== undefined) updateData.passphrase = formData.passphrase;

      await updateMutation.mutateAsync({
        id: repository.id,
        data: updateData
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to update repository:', error);
    }
  };

  const handleChange = (field: keyof RepositoryUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Edit Repository</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Repository Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Repository Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              />
            </div>

            {/* SSH Key Path */}
            <div>
              <label htmlFor="ssh_key_path" className="block text-sm font-medium text-gray-700 mb-1">
                SSH Key Path
              </label>
              <input
                type="text"
                id="ssh_key_path"
                value={formData.ssh_key_path || ''}
                onChange={(e) => handleChange('ssh_key_path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="/path/to/ssh/key"
              />
            </div>

            {/* SSH Auth Method */}
            <div>
              <label htmlFor="ssh_auth_method" className="block text-sm font-medium text-gray-700 mb-1">
                SSH Authentication
              </label>
              <select
                id="ssh_auth_method"
                value={formData.ssh_auth_method || 'key'}
                onChange={(e) => handleChange('ssh_auth_method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="key">SSH Key</option>
                <option value="password">Password</option>
              </select>
            </div>

            {/* Remote Path */}
            <div>
              <label htmlFor="remote_path" className="block text-sm font-medium text-gray-700 mb-1">
                Remote Borg Path
              </label>
              <input
                type="text"
                id="remote_path"
                value={formData.remote_path || ''}
                onChange={(e) => handleChange('remote_path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="borg-1.4"
              />
            </div>

            {/* Repository Passphrase - The key field! */}
            <div>
              <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-1">
                Repository Passphrase
                <span className="text-xs text-gray-500 ml-2">(Required for encrypted repositories)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="passphrase"
                  value={formData.passphrase || ''}
                  onChange={(e) => handleChange('passphrase', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="Enter repository passphrase"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 py-2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This is the passphrase you use when accessing your Borg repository manually.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active || false}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Repository is active
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Repository'}
              </button>
            </div>
          </form>

          {/* Error Display */}
          {updateMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">
                Failed to update repository: {updateMutation.error?.message || 'Unknown error'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}