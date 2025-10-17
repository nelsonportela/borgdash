import { useState } from 'react';
import { useBackupJobs, useDeleteBackupJob, useRunBackupJobNow, useCreateBackupJob, useUpdateBackupJob } from '../services/backupJobs';
import { Play, Pause, Edit, Trash2, Plus, Clock, Calendar, CheckCircle, XCircle, Loader } from 'lucide-react';
import BackupJobForm from '../components/BackupJobForm';

export default function BackupJobsPage() {
  const { data: jobs, isLoading, error } = useBackupJobs();
  const deleteJob = useDeleteBackupJob();
  const runJobNow = useRunBackupJobNow();
  const createJob = useCreateBackupJob();
  const updateJob = useUpdateBackupJob();
  
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the backup job "${name}"?`)) {
      try {
        await deleteJob.mutateAsync(id);
      } catch (error) {
        alert('Failed to delete backup job');
      }
    }
  };

  const handleEdit = (job: any) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingJob(null);
  };

  const handleFormSubmit = async (jobData: any) => {
    try {
      if (editingJob) {
        await updateJob.mutateAsync({ id: editingJob.id, job: jobData });
      } else {
        await createJob.mutateAsync(jobData);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleRunNow = async (id: number, name: string) => {
    if (confirm(`Run backup job "${name}" now?`)) {
      try {
        await runJobNow.mutateAsync(id);
        alert('Backup job started successfully');
      } catch (error) {
        alert('Failed to start backup job');
      }
    }
  };

  const formatCron = (cron: string) => {
    // Simple cron to human-readable conversion
    const parts = cron.split(' ');
    if (parts[0] === '0' && parts[1] === '2' && parts[2] === '*') {
      return 'Daily at 2:00 AM';
    }
    if (parts[0] === '0' && parts[1] === '*') {
      return 'Every hour';
    }
    return cron;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatDateTime = (date?: string) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Backup Jobs</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Backup Job
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Loader className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading backup jobs
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No backup jobs configured</p>
          <p className="text-gray-500 mt-2">Create your first backup job to get started</p>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className={!job.enabled ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusIcon(job.last_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {job.enabled ? (
                        <Play className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <Pause className="h-4 w-4 text-gray-400 mr-2" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{job.name}</div>
                        <div className="text-sm text-gray-500">{job.source_paths.length} source(s)</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCron(job.schedule_cron)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(job.last_run_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(job.next_run_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRunNow(job.id, job.name)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Run now"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(job)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id, job.name)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <BackupJobForm
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          initialData={editingJob}
          isEdit={!!editingJob}
        />
      )}
    </div>
  );
}
