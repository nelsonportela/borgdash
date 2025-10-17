import { apiClient } from './api';

export interface BackupJob {
  id: number;
  name: string;
  repository_id: number;
  enabled: boolean;
  source_paths: string[];
  exclusion_patterns: string[];
  schedule_cron: string;
  timezone: string;
  compression: string;
  archive_name_pattern: string;
  pre_backup_script?: string;
  post_backup_script?: string;
  keep_last?: number;
  keep_hourly?: number;
  keep_daily?: number;
  keep_weekly?: number;
  keep_monthly?: number;
  keep_yearly?: number;
  auto_prune: boolean;
  last_run_at?: string;
  last_status?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BackupJobCreate {
  name: string;
  repository_id: number;
  enabled?: boolean;
  source_paths: string[];
  exclusion_patterns?: string[];
  schedule_cron: string;
  timezone?: string;
  compression?: string;
  archive_name_pattern?: string;
  pre_backup_script?: string;
  post_backup_script?: string;
  keep_last?: number;
  keep_hourly?: number;
  keep_daily?: number;
  keep_weekly?: number;
  keep_monthly?: number;
  keep_yearly?: number;
  auto_prune?: boolean;
}

export interface BackupJobUpdate {
  name?: string;
  repository_id?: number;
  enabled?: boolean;
  source_paths?: string[];
  exclusion_patterns?: string[];
  schedule_cron?: string;
  timezone?: string;
  compression?: string;
  archive_name_pattern?: string;
  pre_backup_script?: string;
  post_backup_script?: string;
  keep_last?: number;
  keep_hourly?: number;
  keep_daily?: number;
  keep_weekly?: number;
  keep_monthly?: number;
  keep_yearly?: number;
  auto_prune?: boolean;
}

export interface BackupJobRun {
  id: number;
  job_id: number;
  archive_id?: number;
  started_at: string;
  finished_at?: string;
  status: string;
  log_output?: string;
  error_message?: string;
  bytes_processed?: number;
  bytes_deduplicated?: number;
  duration_seconds?: number;
}

export const backupJobsService = {
  list: async (enabled?: boolean): Promise<BackupJob[]> => {
    const params = enabled !== undefined ? `?enabled=${enabled}` : '';
    const response = await apiClient.get(`/backup-jobs${params}`);
    return response.data;
  },

  get: async (id: number): Promise<BackupJob> => {
    const response = await apiClient.get(`/backup-jobs/${id}`);
    return response.data;
  },

  create: async (job: BackupJobCreate): Promise<BackupJob> => {
    const response = await apiClient.post('/backup-jobs', job);
    return response.data;
  },

  update: async (id: number, job: BackupJobUpdate): Promise<BackupJob> => {
    const response = await apiClient.put(`/backup-jobs/${id}`, job);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/backup-jobs/${id}`);
  },

  runNow: async (id: number): Promise<BackupJobRun> => {
    const response = await apiClient.post(`/backup-jobs/${id}/run`);
    return response.data;
  },

  getRuns: async (id: number, limit?: number): Promise<BackupJobRun[]> => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get(`/backup-jobs/${id}/runs${params}`);
    return response.data;
  },
};

// React Query hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useBackupJobs = (enabled?: boolean) => {
  return useQuery({
    queryKey: ['backup-jobs', enabled],
    queryFn: () => backupJobsService.list(enabled),
  });
};

export const useBackupJob = (id: number) => {
  return useQuery({
    queryKey: ['backup-jobs', id],
    queryFn: () => backupJobsService.get(id),
    enabled: !!id,
  });
};

export const useCreateBackupJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backupJobsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
    },
  });
};

export const useUpdateBackupJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, job }: { id: number; job: BackupJobUpdate }) =>
      backupJobsService.update(id, job),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
    },
  });
};

export const useDeleteBackupJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backupJobsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
    },
  });
};

export const useRunBackupJobNow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backupJobsService.runNow,
    onSuccess: (_data, jobId: number) => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
    },
  });
};

export const useBackupJobRuns = (jobId: number, limit?: number) => {
  return useQuery({
    queryKey: ['backup-job-runs', jobId, limit],
    queryFn: () => backupJobsService.getRuns(jobId, limit),
    enabled: !!jobId,
  });
};
