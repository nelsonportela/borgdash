import { useState } from 'react';
import { RepositoryList } from '../components/RepositoryList';
import { RepositoryForm } from '../components/RepositoryForm';
import { RepositoryEditForm } from '../components/RepositoryEditForm';
import { ImportRepositoryModal } from '../components/ImportRepositoryModal';
import { useRepositories, useCreateRepository, useDeleteRepository, useTestRepositoryConnection, useImportRepository } from '../services/repositories';
import { Repository, RepositoryCreate, RepositoryImport } from '../types/api';

export function RepositoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingRepository, setEditingRepository] = useState<Repository | null>(null);
  
  const { data: repositories = [], isLoading, error } = useRepositories();
  const typedRepositories = repositories as Repository[];
  const createMutation = useCreateRepository();
  const deleteMutation = useDeleteRepository();
  const testConnectionMutation = useTestRepositoryConnection();
  const importMutation = useImportRepository();

  const handleCreateRepository = async (data: RepositoryCreate) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create repository:', err);
    }
  };

  const handleDeleteRepository = async (repository: Repository) => {
    if (window.confirm(`Are you sure you want to delete repository "${repository.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(repository.id);
      } catch (err) {
        console.error('Failed to delete repository:', err);
      }
    }
  };

  const handleTestConnection = async (repository: Repository) => {
    try {
      const result = await testConnectionMutation.mutateAsync(repository.id);
      
      if (result.status === 'connected') {
        alert(`✅ Connection successful!\n\nRepository "${repository.name}" is accessible.`);
      } else if (result.status === 'error') {
        alert(`❌ Connection failed!\n\nRepository: ${repository.name}\nError: ${result.message}`);
      } else if (result.status === 'unreachable') {
        alert(`🔌 Repository unreachable!\n\nRepository: ${repository.name}\nReason: ${result.message}`);
      }
    } catch (err: any) {
      alert(`❌ Test failed!\n\nCouldn't test connection for "${repository.name}"\nError: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEditRepository = (repository: Repository) => {
    setEditingRepository(repository);
    setShowForm(false); // Close create form if open
  };

  const handleEditSuccess = () => {
    setEditingRepository(null);
  };

  const handleImportRepository = async (data: RepositoryImport) => {
    try {
      const result = await importMutation.mutateAsync(data);
      setShowImportModal(false);
      alert(`✅ Repository imported successfully!\n\nRepository: ${result.repository.name}\nArchives imported: ${result.archives_imported}\n\nArchives:\n${result.archives.join('\n')}`);
    } catch (err: any) {
      throw err; // Let the modal handle the error
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Repository
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showForm ? 'Cancel' : 'Create New'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <RepositoryForm
            onSubmit={handleCreateRepository}
            onCancel={() => setShowForm(false)}
            loading={createMutation.isPending}
            error={createMutation.error?.message}
          />
        </div>
      )}

      <RepositoryList
        repositories={typedRepositories}
        loading={isLoading}
        error={error?.message}
        onEdit={handleEditRepository}
        onDelete={handleDeleteRepository}
        onTest={handleTestConnection}
      />
      
      {/* Edit Repository Modal */}
      {editingRepository && (
        <RepositoryEditForm
          repository={editingRepository}
          onClose={() => setEditingRepository(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Import Repository Modal */}
      <ImportRepositoryModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportRepository}
      />
    </div>
  );
}