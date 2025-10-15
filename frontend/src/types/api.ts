// TypeScript definitions for BorgDash API

// Repository Types
export interface Repository {
  id: number;
  name: string;
  url: string;
  repo_type: 'local' | 'ssh';
  encryption_mode?: 'none' | 'authenticated' | 'authenticated-blake2' | 'repokey' | 'repokey-blake2' | 'keyfile' | 'keyfile-blake2';
  ssh_key_path?: string;
  ssh_auth_method?: 'key' | 'password';
  remote_path: string;
  last_backup?: string;
  status?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RepositoryCreate {
  name: string;
  url: string;
  repo_type: 'local' | 'ssh';
  encryption_mode?: string;
  ssh_key_path?: string;
  ssh_password?: string;
  ssh_auth_method?: 'key' | 'password';
  remote_path?: string;
  passphrase?: string;
}

export interface RepositoryUpdate {
  name?: string;
  ssh_key_path?: string;
  ssh_auth_method?: 'key' | 'password';
  remote_path?: string;
  passphrase?: string;
  is_active?: boolean;
}

export interface RepositoryStatus {
  id: number;
  name: string;
  status: 'connected' | 'unreachable' | 'error';
  message?: string;
  last_checked: string;
}

// Archive Types
export interface Archive {
  id: number;
  repository_id: number;
  name: string;
  borg_id?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  original_size?: number;
  compressed_size?: number;
  deduplicated_size?: number;
  nfiles?: number;
  hostname?: string;
  username?: string;
  comment?: string;
  stats?: string;
  created_at: string;
}

export interface ArchiveCreate {
  repository_id: number;
  name: string;
  comment?: string;
  paths: string[];
  exclude_patterns?: string[];
  compression?: string;
  checkpoint_interval?: number;
}

export interface ArchiveProgress {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  message?: string;
  current_file?: string;
  files_processed?: number;
  bytes_processed?: number;
}

// Statistics Types
export interface RepositoryStats {
  id: number;
  name: string;
  total_size: number;
  compressed_size: number;
  unique_chunks: number;
  total_chunks: number;
  archive_count: number;
  last_backup?: string;
}

export interface ArchiveStats {
  original_size: number;
  compressed_size: number;
  deduplicated_size: number;
  nfiles: number;
  compression_ratio: number;
  deduplication_ratio: number;
}

export interface SystemStats {
  disk_usage: {
    total: number;
    used: number;
    free: number;
  };
  memory_usage: {
    total: number;
    used: number;
    free: number;
  };
  active_backups: number;
  repository_count: number;
  archive_count: number;
}

// API Error Type
export interface ApiError {
  detail: string;
  status_code?: number;
}