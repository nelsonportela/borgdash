// Archive API service
import { api } from './api';
import { 
  Archive, 
  ArchiveCreate
} from '../types/api';

export class ArchiveService {
  private static readonly BASE_PATH = '/archives';

  // Get all archives (optionally filtered by repository)
  static async getArchives(repositoryId?: number, limit = 100, offset = 0): Promise<Archive[]> {
    const params = new URLSearchParams();
    if (repositoryId) params.append('repository_id', repositoryId.toString());
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<Archive[]>(`${ArchiveService.BASE_PATH}${query}`);
  }

  // Get a specific archive
  static async getArchive(id: number): Promise<Archive> {
    return api.get<Archive>(`${ArchiveService.BASE_PATH}/${id}`);
  }

  // Create a new archive (backup)
  static async createArchive(data: ArchiveCreate): Promise<Archive> {
    return api.post<Archive>(ArchiveService.BASE_PATH, data);
  }

  // Delete an archive
  static async deleteArchive(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`${ArchiveService.BASE_PATH}/${id}`);
  }

  // Get archive info
  static async getArchiveInfo(id: number): Promise<any> {
    return api.get<any>(`${ArchiveService.BASE_PATH}/${id}/info`);
  }

  // List archive contents
  static async listArchiveContents(id: number, path = ''): Promise<any> {
    const params = path ? `?path=${encodeURIComponent(path)}` : '';
    return api.get<any>(`${ArchiveService.BASE_PATH}/${id}/list${params}`);
  }

  // Get archive progress
  static async getArchiveProgress(id: number): Promise<any> {
    return api.get<any>(`${ArchiveService.BASE_PATH}/${id}/progress`);
  }

  // Refresh archive statistics from Borg
  static async refreshArchiveStats(id: number): Promise<Archive> {
    return api.post<Archive>(`${ArchiveService.BASE_PATH}/${id}/refresh`);
  }
}

// React Query hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useArchives = (repositoryId?: number) => {
  return useQuery({
    queryKey: ['archives', repositoryId],
    queryFn: () => ArchiveService.getArchives(repositoryId),
    refetchInterval: (query) => {
      // Poll every 3 seconds if any archive is running (has start_time but no end_time)
      const data = query.state.data as Archive[] | undefined;
      const hasRunningArchive = data?.some((archive: Archive) => 
        archive.start_time && !archive.end_time
      );
      return hasRunningArchive ? 3000 : false;
    },
    refetchIntervalInBackground: false,
  });
};

export const useArchive = (id: number) => {
  return useQuery({
    queryKey: ['archive', id],
    queryFn: () => ArchiveService.getArchive(id),
    enabled: !!id,
  });
};

export const useCreateArchive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ArchiveService.createArchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });
};

export const useDeleteArchive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ArchiveService.deleteArchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });
};

export const useArchiveContents = (id: number, path = '') => {
  return useQuery({
    queryKey: ['archive-contents', id, path],
    queryFn: () => ArchiveService.listArchiveContents(id, path),
    enabled: !!id,
  });
};

// Get archive backup progress
export const useArchiveProgress = (id: number, enabled = false) => {
  return useQuery({
    queryKey: ['archive-progress', id],
    queryFn: () => ArchiveService.getArchiveProgress(id),
    enabled: enabled && !!id,
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: false,
  });
};

// Refresh archive stats
export const useRefreshArchiveStats = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ArchiveService.refreshArchiveStats,
    onSuccess: (_data, archiveId) => {
      // Invalidate both archives list and specific archive
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.invalidateQueries({ queryKey: ['archive', archiveId] });
    },
  });
};