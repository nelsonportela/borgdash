// Repository API service
import { api } from './api';
import { 
  Repository, 
  RepositoryCreate, 
  RepositoryUpdate, 
  RepositoryStatus 
} from '../types/api';

export class RepositoryService {
  private static readonly BASE_PATH = '/repositories';

  // Get all repositories
  static async getRepositories(): Promise<Repository[]> {
    return api.get<Repository[]>(RepositoryService.BASE_PATH);
  }

  // Get a specific repository
  static async getRepository(id: number): Promise<Repository> {
    return api.get<Repository>(`${RepositoryService.BASE_PATH}/${id}`);
  }

  // Create a new repository
  static async createRepository(data: RepositoryCreate): Promise<Repository> {
    return api.post<Repository>(RepositoryService.BASE_PATH, data);
  }

  // Update a repository
  static async updateRepository(id: number, data: RepositoryUpdate): Promise<Repository> {
    return api.put<Repository>(`${RepositoryService.BASE_PATH}/${id}`, data);
  }

  // Delete a repository (mark as inactive)
  static async deleteRepository(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`${RepositoryService.BASE_PATH}/${id}`);
  }

  // Test repository connection
  static async testConnection(id: number): Promise<RepositoryStatus> {
    return api.post<RepositoryStatus>(`${RepositoryService.BASE_PATH}/${id}/test`);
  }

  // Get repository info
  static async getRepositoryInfo(id: number): Promise<any> {
    return api.get<any>(`${RepositoryService.BASE_PATH}/${id}/info`);
  }
}

// Hook for using repository service with React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useRepositories = () => {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: RepositoryService.getRepositories,
    refetchInterval: (query) => {
      // Poll every 2 seconds if any repository is initializing
      const data = query.state.data as Repository[] | undefined;
      const hasInitializingRepo = data?.some((repo: Repository) => repo.status === 'initializing');
      return hasInitializingRepo ? 2000 : false;
    },
    refetchIntervalInBackground: false,
  });
};

export const useRepository = (id: number) => {
  return useQuery({
    queryKey: ['repository', id],
    queryFn: () => RepositoryService.getRepository(id),
    enabled: !!id,
  });
};

export const useCreateRepository = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: RepositoryService.createRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
};

export const useUpdateRepository = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RepositoryUpdate }) =>
      RepositoryService.updateRepository(id, data),
    onSuccess: (_: Repository, variables: { id: number; data: RepositoryUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['repository', variables.id] });
    },
  });
};

export const useDeleteRepository = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: RepositoryService.deleteRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
};

export const useTestRepositoryConnection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: RepositoryService.testConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
};