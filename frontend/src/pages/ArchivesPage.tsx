import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArchiveList } from '../components/ArchiveList';
import { ArchiveForm } from '../components/ArchiveForm';
import { ArchiveDetailsView } from '../components/ArchiveDetailsView';
import { useArchives, useCreateArchive, useDeleteArchive } from '../services/archives';
import { useRepositories } from '../services/repositories';
import { Archive, ArchiveCreate, Repository } from '../types/api';

export function ArchivesPage() {
  const { id: repositoryIdParam } = useParams<{ id: string }>();
  const repositoryId = repositoryIdParam ? parseInt(repositoryIdParam) : undefined;
  
  const [showForm, setShowForm] = useState(false);
  const [selectedRepositoryFilter, setSelectedRepositoryFilter] = useState<number | undefined>(repositoryId);
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  
  const { data: repositories = [], isLoading: repositoriesLoading } = useRepositories();
  const { data: archives = [], isLoading: archivesLoading, error } = useArchives(selectedRepositoryFilter);
  const createMutation = useCreateArchive();
  const deleteMutation = useDeleteArchive();

  const handleCreateArchive = async (data: ArchiveCreate) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create archive:', err);
    }
  };

  const handleDeleteArchive = async (archive: Archive) => {
    if (window.confirm(`Are you sure you want to delete archive "${archive.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(archive.id);
      } catch (err) {
        console.error('Failed to delete archive:', err);
      }
    }
  };

  const handleViewDetails = (archive: Archive) => {
    setSelectedArchive(archive);
  };

  // Create repository name lookup
  const repositoryNames = (repositories as Repository[]).reduce((acc: { [key: number]: string }, repo: Repository) => {
    acc[repo.id] = repo.name;
    return acc;
  }, {} as { [key: number]: string });

  // Get initialized repositories for the form
  const initializedRepositories = (repositories as Repository[]).filter((repo: Repository) => repo.status === 'initialized');

  // Filter repositories for dropdown
  const repositoryFilterOptions = [
    { value: undefined, label: 'All Repositories' },
    ...(repositories as Repository[]).map((repo: Repository) => ({ value: repo.id, label: repo.name }))
  ];

  const getPageTitle = () => {
    if (repositoryId && repositoryNames[repositoryId]) {
      return `Archives - ${repositoryNames[repositoryId]}`;
    }
    return 'Archives';
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          {repositoryId && repositoryNames[repositoryId] && (
            <nav className="text-sm text-gray-500 mt-1">
              <a href="/repositories" className="hover:text-gray-700">Repositories</a>
              <span className="mx-2">›</span>
              <span>{repositoryNames[repositoryId]}</span>
              <span className="mx-2">›</span>
              <span>Archives</span>
            </nav>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={initializedRepositories.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showForm ? 'Cancel' : 'Create Backup'}
        </button>
      </div>

      {/* Repository Filter */}
      {!repositoryId && (repositories as Repository[]).length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Repository
          </label>
          <select
            value={selectedRepositoryFilter || ''}
            onChange={(e) => setSelectedRepositoryFilter(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full max-w-xs px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {repositoryFilterOptions.map(option => (
              <option key={option.value || 'all'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Archive Form */}
      {showForm && (
        <div className="mb-6">
          <ArchiveForm
            repositories={initializedRepositories}
            selectedRepositoryId={selectedRepositoryFilter}
            onSubmit={handleCreateArchive}
            onCancel={() => setShowForm(false)}
            loading={createMutation.isPending}
            error={createMutation.error?.message}
          />
        </div>
      )}

      {/* No Repositories Available */}
      {initializedRepositories.length === 0 && !repositoriesLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="text-yellow-700">
              <h3 className="text-sm font-medium">No repositories available</h3>
              <p className="mt-1 text-sm">
                You need to create and initialize at least one repository before creating backups.
              </p>
              <div className="mt-3">
                <a
                  href="/repositories"
                  className="text-sm font-medium text-yellow-700 hover:text-yellow-600"
                >
                  Go to Repositories →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive List */}
      <ArchiveList
        archives={archives as Archive[]}
        repositoryNames={repositoryNames}
        loading={archivesLoading}
        error={error?.message}
        onDelete={handleDeleteArchive}
        onViewDetails={handleViewDetails}
      />

      {/* Archive Details Modal */}
      {selectedArchive && (
        <ArchiveDetailsView
          archive={selectedArchive}
          onClose={() => setSelectedArchive(null)}
        />
      )}
    </div>
  );
}