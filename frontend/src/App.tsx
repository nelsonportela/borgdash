import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { RepositoriesPage } from './pages/RepositoriesPage'
import { ArchivesPage } from './pages/ArchivesPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/archives" element={<ArchivesPage />} />
        <Route path="/repositories/:id/archives" element={<ArchivesPage />} />
      </Routes>
    </Layout>
  )
}

export default App