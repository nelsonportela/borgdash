import { useState } from 'react';
import { X } from 'lucide-react';
import { BackupJobCreate, BackupJobUpdate } from '../services/backupJobs';
import { useRepositories } from '../services/repositories';

interface BackupJobFormProps {
  onClose: () => void;
  onSubmit: (job: BackupJobCreate | BackupJobUpdate) => Promise<void>;
  initialData?: BackupJobUpdate & { id?: number };
  isEdit?: boolean;
}

export default function BackupJobForm({ onClose, onSubmit, initialData, isEdit = false }: BackupJobFormProps) {
  const { data: repositories } = useRepositories();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [repositoryId, setRepositoryId] = useState(initialData?.repository_id || 0);
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  
  // Source paths
  const [sourcePaths, setSourcePaths] = useState<string[]>(initialData?.source_paths || ['']);
  const [exclusionPatterns, setExclusionPatterns] = useState<string[]>(initialData?.exclusion_patterns || []);
  const [newExclusion, setNewExclusion] = useState('');
  
  // Schedule
  const [scheduleCron, setScheduleCron] = useState(initialData?.schedule_cron || '0 2 * * *');
  const [timezone, setTimezone] = useState(initialData?.timezone || 'UTC');
  
  // Backup options
  const [compression, setCompression] = useState(initialData?.compression || 'lz4');
  const [archiveNamePattern, setArchiveNamePattern] = useState(initialData?.archive_name_pattern || '{hostname}-{now}');
  
  // Scripts
  const [preBackupScript, setPreBackupScript] = useState(initialData?.pre_backup_script || '');
  const [postBackupScript, setPostBackupScript] = useState(initialData?.post_backup_script || '');
  
  // Retention
  const [keepLast, setKeepLast] = useState(initialData?.keep_last?.toString() || '');
  const [keepHourly, setKeepHourly] = useState(initialData?.keep_hourly?.toString() || '');
  const [keepDaily, setKeepDaily] = useState(initialData?.keep_daily?.toString() || '');
  const [keepWeekly, setKeepWeekly] = useState(initialData?.keep_weekly?.toString() || '');
  const [keepMonthly, setKeepMonthly] = useState(initialData?.keep_monthly?.toString() || '');
  const [keepYearly, setKeepYearly] = useState(initialData?.keep_yearly?.toString() || '');
  const [autoPrune, setAutoPrune] = useState(initialData?.auto_prune ?? true);

  const addSourcePath = () => {
    setSourcePaths([...sourcePaths, '']);
  };

  const removeSourcePath = (index: number) => {
    setSourcePaths(sourcePaths.filter((_, i) => i !== index));
  };

  const updateSourcePath = (index: number, value: string) => {
    const newPaths = [...sourcePaths];
    newPaths[index] = value;
    setSourcePaths(newPaths);
  };

  const addExclusion = () => {
    if (newExclusion.trim()) {
      setExclusionPatterns([...exclusionPatterns, newExclusion.trim()]);
      setNewExclusion('');
    }
  };

  const removeExclusion = (index: number) => {
    setExclusionPatterns(exclusionPatterns.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a job name');
      return;
    }
    
    if (!repositoryId) {
      alert('Please select a repository');
      return;
    }
    
    const validPaths = sourcePaths.filter(p => p.trim());
    if (validPaths.length === 0) {
      alert('Please add at least one source path');
      return;
    }

    setIsSubmitting(true);
    try {
      const jobData: BackupJobCreate = {
        name: name.trim(),
        repository_id: repositoryId,
        enabled,
        source_paths: validPaths,
        exclusion_patterns: exclusionPatterns,
        schedule_cron: scheduleCron,
        timezone,
        compression,
        archive_name_pattern: archiveNamePattern,
        pre_backup_script: preBackupScript.trim() || undefined,
        post_backup_script: postBackupScript.trim() || undefined,
        keep_last: keepLast ? parseInt(keepLast) : undefined,
        keep_hourly: keepHourly ? parseInt(keepHourly) : undefined,
        keep_daily: keepDaily ? parseInt(keepDaily) : undefined,
        keep_weekly: keepWeekly ? parseInt(keepWeekly) : undefined,
        keep_monthly: keepMonthly ? parseInt(keepMonthly) : undefined,
        keep_yearly: keepYearly ? parseInt(keepYearly) : undefined,
        auto_prune: autoPrune,
      };

      await onSubmit(jobData);
      onClose();
    } catch (error) {
      alert('Failed to save backup job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonCronExamples = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Daily at 2 AM', value: '0 2 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Weekly (Sunday 2 AM)', value: '0 2 * * 0' },
    { label: 'Monthly (1st at 2 AM)', value: '0 2 1 * *' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Backup Job' : 'Create Backup Job'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Basic Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="e.g., Daily Home Backup"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repository *
                </label>
                <select
                  value={repositoryId}
                  onChange={(e) => setRepositoryId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  required
                >
                  <option value={0}>Select a repository</option>
                  {repositories?.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                  Enabled (job will run on schedule)
                </label>
              </div>
            </div>
          </div>

          {/* Source Paths */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Source Paths</h3>
            <div className="space-y-2">
              {sourcePaths.map((path, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => updateSourcePath(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="/path/to/backup"
                  />
                  {sourcePaths.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSourcePath(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSourcePath}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Path
              </button>
            </div>
          </div>

          {/* Exclusion Patterns */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Exclusion Patterns</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExclusion())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="*.tmp, node_modules, .cache"
                />
                <button
                  type="button"
                  onClick={addExclusion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {exclusionPatterns.map((pattern, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {pattern}
                    <button
                      type="button"
                      onClick={() => removeExclusion(index)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cron Expression *
                </label>
                <input
                  type="text"
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-mono placeholder-gray-500"
                  placeholder="0 2 * * *"
                  required
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">Common schedules:</p>
                  {commonCronExamples.map((example) => (
                    <button
                      key={example.value}
                      type="button"
                      onClick={() => setScheduleCron(example.value)}
                      className="block text-xs text-blue-600 hover:text-blue-800"
                    >
                      {example.label}: {example.value}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="UTC"
                />
              </div>
            </div>
          </div>

          {/* Backup Options */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Backup Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compression
                </label>
                <select
                  value={compression}
                  onChange={(e) => setCompression(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="none">None</option>
                  <option value="lz4">LZ4 (fast)</option>
                  <option value="zstd">Zstd (recommended)</option>
                  <option value="zlib">Zlib</option>
                  <option value="lzma">LZMA (high compression)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archive Name Pattern
                </label>
                <input
                  type="text"
                  value={archiveNamePattern}
                  onChange={(e) => setArchiveNamePattern(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-mono placeholder-gray-500"
                  placeholder="{hostname}-{now}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {'{hostname}'}, {'{now}'}
                </p>
              </div>
            </div>
          </div>

          {/* Retention Policy */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Retention Policy</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set at least one retention rule if auto-prune is enabled. Empty fields will be ignored.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keep Last
                </label>
                <input
                  type="number"
                  min="0"
                  value={keepLast}
                  onChange={(e) => setKeepLast(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="N"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keep Hourly
                </label>
                <input
                  type="number"
                  min="0"
                  value={keepHourly}
                  onChange={(e) => setKeepHourly(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="N"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keep Daily
                </label>
                <input
                  type="number"
                  min="0"
                  value={keepDaily}
                  onChange={(e) => setKeepDaily(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="7"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keep Weekly
                </label>
                <input
                  type="number"
                  min="0"
                  value={keepWeekly}
                  onChange={(e) => setKeepWeekly(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="4"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keep Monthly
                </label>
                <input
                  type="number"
                  min="0"
                  value={keepMonthly}
                  onChange={(e) => setKeepMonthly(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="6"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keep Yearly
                </label>
                <input
                  type="number"
                  min="0"
                  value={keepYearly}
                  onChange={(e) => setKeepYearly(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="N"
                />
              </div>
            </div>
            
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="autoPrune"
                checked={autoPrune}
                onChange={(e) => setAutoPrune(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoPrune" className="ml-2 block text-sm text-gray-900">
                Auto-prune after backup (run prune + compact automatically)
              </label>
            </div>
          </div>

          {/* Pre/Post Scripts */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Scripts (Optional)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pre-Backup Script
                </label>
                <textarea
                  value={preBackupScript}
                  onChange={(e) => setPreBackupScript(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-mono text-sm placeholder-gray-500"
                  rows={3}
                  placeholder="#!/bin/bash&#10;# Script to run before backup"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post-Backup Script
                </label>
                <textarea
                  value={postBackupScript}
                  onChange={(e) => setPostBackupScript(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-mono text-sm placeholder-gray-500"
                  rows={3}
                  placeholder="#!/bin/bash&#10;# Script to run after backup"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
