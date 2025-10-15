# BorgDash - Containerized Borg Backup Web UI

## 📋 Project Overview

BorgDash v0.1.0 is a modern, containerized web UI for managing Borg Backup repositories and archives. It provides an intuitive interface for creating repositories, managing backups, and visualizing storage statistics.

## 🏗️ Technical Architecture

### **Tech Stack:**
- **Backend:** Python with FastAPI (async operations, native Borg integration)
- **Frontend:** React with TypeScript + Tailwind CSS + Vite
- **Database:** SQLite (lightweight, containerized metadata storage)
- **Containerization:** Multi-stage Docker build + docker-compose
- **Visualization:** Chart.js/Recharts for data visualization
- **CI/CD:** GitHub Actions for automated builds

### **Architecture Rationale:**
1. **Python/FastAPI** - Seamless Borg CLI integration, excellent SSH handling
2. **React/TypeScript** - Modern component architecture with type safety
3. **Tailwind CSS** - Utility-first styling for consistent, modern UI
4. **SQLite** - Simple, file-based database perfect for single-container deployment

## 📁 Project Structure
```
borgdash/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── repositories.py
│   │   │   ├── archives.py
│   │   │   └── stats.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── repository.py
│   │   │   └── archive.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── borg_service.py
│   │   │   └── ssh_service.py
│   │   ├── database.py
│   │   ├── config.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── Repository/
│   │   │   ├── Archive/
│   │   │   ├── Charts/
│   │   │   └── Common/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── RepositoryPage.tsx
│   │   │   └── ArchivePage.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yaml
├── .github/
│   └── workflows/
│       └── build-and-publish.yml
├── .gitignore
├── README.md
└── PROJECT_PLAN.md
```

## 🚀 Core Features

### **Phase 1: Repository Management**
- ✅ Initialize new Borg repositories (local & SSH)
- ✅ List and manage existing repositories
- ✅ Test repository connections
- ✅ SSH key management interface

### **Phase 2: Archive Operations**
- ✅ Create new backups/archives
- ✅ List archives with detailed metadata
- ✅ Display archive statistics (size, files, etc.)
- ✅ Real-time progress tracking

### **Phase 3: Data Visualization & Analytics**
- ✅ Storage usage charts (pie/donut/bar charts)
- ✅ Deduplication efficiency visualization
- ✅ Backup timeline and frequency analysis
- ✅ Repository growth trends over time
- ✅ Available vs used space indicators

### **Phase 4: Advanced Features**
- 🔄 Repository health monitoring
- 🔄 Multi-repository dashboard view
- 🔄 Configuration export/import
- 🔄 Backup scheduling (future enhancement)

## 🐳 Containerization Strategy

### **Docker Architecture:**
```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │
│   (Nginx)       │◄───┤   (FastAPI)     │
│   React Build   │    │   + Borg CLI    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                    │
            ┌─────────────────┐
            │   Shared        │
            │   Volumes       │
            │ (SSH Keys, DB)  │
            └─────────────────┘
```

### **Key Container Features:**
- Multi-stage builds for optimized image sizes
- Borg 1.4+ binary included in backend
- SSH client and key management
- Volume mounts for persistent data
- Health checks and monitoring
- Environment-based configuration

## 📊 User Interface Design

### **Design Principles:**
- **Modern & Clean:** Minimalist design with focus on functionality
- **Responsive:** Mobile-first approach with desktop optimization
- **Accessible:** WCAG compliant with keyboard navigation
- **Intuitive:** Clear navigation and consistent UI patterns

### **Key UI Components:**

#### **1. Dashboard Page**
- Repository overview cards with quick stats
- Recent backup activity timeline
- System status indicators
- Quick action buttons

#### **2. Repository Management**
- Add new repository wizard
- Repository list with connection status
- SSH configuration interface
- Repository settings and information

#### **3. Archive Browser**
- Searchable archive list with filters
- Archive details with file counts and sizes
- Backup progress indicators
- Creation and management tools

#### **4. Analytics & Visualization**
- Interactive charts for storage analysis
- Deduplication efficiency metrics
- Historical trends and patterns
- Exportable reports

#### **5. Settings & Configuration**
- SSH key management
- Application preferences
- Theme selection (dark/light mode)
- Advanced Borg options

## 🔧 SSH Repository Support

### **Supported SSH Features:**
```bash
# Example repository URLs supported:
ssh://user@hostname:port/path/to/repo
ssh://u391780@u391780.your-storagebox.de:23/./borg
user@hostname:/path/to/repo
```

### **SSH Configuration:**
- SSH key pair generation and management
- Custom port and remote path support
- Connection testing and validation
- Multiple authentication methods
- Encrypted passphrase handling

## 🎯 Development Timeline

### **Week 1: Foundation**
- [x] Project planning and architecture
- [ ] Directory structure setup
- [ ] Basic FastAPI backend skeleton
- [ ] React frontend initialization
- [ ] Basic Docker configuration

### **Week 2: Core Backend**
- [ ] Borg service integration
- [ ] Repository management API
- [ ] Archive operations API
- [ ] SSH connectivity handling
- [ ] Database models and persistence

### **Week 3: Frontend Development**
- [ ] UI component library setup
- [ ] Dashboard implementation
- [ ] Repository management interface
- [ ] Archive browser interface
- [ ] API integration and state management

### **Week 4: Visualization & Polish**
- [ ] Data visualization components
- [ ] Statistics and analytics
- [ ] UI/UX refinements
- [ ] Performance optimization

### **Week 5: Production Ready**
- [ ] Docker optimization and testing
- [ ] GitHub Actions CI/CD setup
- [ ] Documentation and deployment guides
- [ ] Final testing and bug fixes

## 🔒 Security Considerations

### **Security Features:**
- Secure SSH key storage and handling
- Input validation and sanitization
- Container security best practices
- Environment-based secrets management
- HTTPS support for production deployments

## 📚 Documentation Plan

### **Documentation Structure:**
- **README.md:** Quick start and basic usage
- **DEPLOYMENT.md:** Production deployment guide
- **API_DOCS.md:** Backend API documentation
- **CONTRIBUTING.md:** Development setup and guidelines
- **TROUBLESHOOTING.md:** Common issues and solutions

## 🚢 Deployment Strategy

### **Single File Deployment:**
Users will receive a single `docker-compose.yaml` file that:
- Pulls pre-built images from registry
- Configures all necessary services
- Sets up volumes and networking
- Includes environment variable templates

### **GitHub Actions Workflow:**
- Automated builds on push to main
- Multi-architecture support (amd64, arm64)
- Semantic versioning and releases
- Registry publishing (Docker Hub/GitHub)

---

## 📝 Notes

- **Borg Version:** Targeting Borg 1.4+ for latest features
- **Browser Support:** Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- **Container Runtime:** Docker 20.10+ or compatible
- **Resource Requirements:** Minimum 512MB RAM, 1GB storage

This plan serves as the roadmap for BorgDash development and will be updated as the project evolves.