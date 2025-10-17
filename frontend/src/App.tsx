import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { RepositoriesPage } from './pages/RepositoriesPage'
import { ArchivesPage } from './pages/ArchivesPage'
import BackupJobsPage from './pages/BackupJobsPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/archives" element={<ArchivesPage />} />
        <Route path="/repositories/:id/archives" element={<ArchivesPage />} />
        <Route path="/backup-jobs" element={<BackupJobsPage />} />
      </Routes>
    </Layout>
  )
}

export default App