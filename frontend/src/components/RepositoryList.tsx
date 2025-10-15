import { Repository } from '../types/api';

interface RepositoryCardProps {
  repository: Repository;
  onEdit?: (repository: Repository) => void;
  onDelete?: (repository: Repository) => void;
  onTest?: (repository: Repository) => void;
}

export function RepositoryCard({ 
  repository, 
  onEdit, 
  onDelete, 
  onTest 
}: RepositoryCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'initialized': return 'bg-green-100 text-green-800';
      case 'initializing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'initialized': return 'Ready';
      case 'initializing': return 'Setting up...';
      case 'pending': return 'Pending';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const renderStatusBadge = (status?: string) => {
    const isInitializing = status === 'initializing';
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
        {isInitializing && (
          <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {getStatusText(status)}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'ssh' ? '🔗' : '📁';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{getTypeIcon(repository.repo_type)}</span>
            <h3 className="text-lg font-semibold text-gray-900">{repository.name}</h3>
            {renderStatusBadge(repository.status)}
          </div>
          
          <div className="text-sm text-gray-600 mb-3">
            <p><strong>URL:</strong> {repository.url}</p>
            <p><strong>Type:</strong> {repository.repo_type.toUpperCase()}</p>
            {repository.encryption_mode && (
              <p><strong>Encryption:</strong> {repository.encryption_mode}</p>
            )}
            {repository.last_backup && (
              <p><strong>Last Backup:</strong> {formatDate(repository.last_backup)}</p>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            Created: {formatDate(repository.created_at)}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {repository.status === 'initialized' && (
            <a
              href={`/repositories/${repository.id}/archives`}
              className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-center"
            >
              View Archives
            </a>
          )}
          {onTest && (
            <button
              onClick={() => onTest(repository)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            >
              Test Connection
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(repository)}
              className="px-3 py-1 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(repository)}
              className="px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface RepositoryListProps {
  repositories: Repository[];
  loading?: boolean;
  error?: string;
  onEdit?: (repository: Repository) => void;
  onDelete?: (repository: Repository) => void;
  onTest?: (repository: Repository) => void;
}

export function RepositoryList({ 
  repositories, 
  loading, 
  error, 
  onEdit, 
  onDelete, 
  onTest 
}: RepositoryListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
            <h3 className="text-sm font-medium">Error loading repositories</h3>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories yet</h3>
        <p className="text-gray-500">Create your first Borg repository to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {repositories.map(repository => (
        <RepositoryCard
          key={repository.id}
          repository={repository}
          onEdit={onEdit}
          onDelete={onDelete}
          onTest={onTest}
        />
      ))}
    </div>
  );
}