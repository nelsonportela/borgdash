# BorgDash - Containerized Borg Backup Web UI

BorgDash is a modern, containerized web interface for managing Borg Backup repositories and archives. It provides an intuitive dashboard for creating repositories, managing backups, and visualizing storage statistics.

## ✨ Features

- 🗂️ **Repository Management** - Create and manage Borg repositories (local & SSH)
- 📦 **Archive Operations** - Create backups and browse archive contents
- 📊 **Data Visualization** - Charts for storage usage, compression, and deduplication
- 🔒 **SSH Support** - Connect to remote repositories with SSH key management
- 🐳 **Fully Containerized** - Single docker-compose deployment
- 🎨 **Modern UI** - Responsive design with dark/light mode support

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### 🎯 Production Deployment

1. **Download the latest release:**
   ```bash
   curl -L https://github.com/nelsonportela/borgdash/releases/latest/download/docker-compose.yaml -o docker-compose.yaml
   ```

2. **Start BorgDash:**
   ```bash
   docker compose up -d
   ```

3. **Access the interface:**
   - Web UI: http://localhost:3000
   - API: http://localhost:8000

### 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nelsonportela/borgdash.git
   cd borgdash
   ```

2. **Start development environment:**
   ```bash
   docker compose -f docker-compose.dev.yaml up --build
   ```

### 🔧 Configuration

**Environment Variables** (optional):
```bash
# Copy example configuration
cp .env.example .env
# Edit as needed
nano .env
```

**Custom Volumes:**
```yaml
# Modify docker-compose.yaml for custom paths
volumes:
  - /your/path/data:/app/data
  - /your/path/ssh_keys:/app/ssh_keys
```

### Default Configuration

- **Ports:**
  - Frontend: 3000
  - Backend API: 8000
- **Data Storage:** Docker volumes for persistence
- **SSH Keys:** Managed within the container

## 📖 Usage Guide

### 1. Repository Management

#### Creating a Local Repository
1. Navigate to "Repositories" page
2. Click "Add Repository"
3. Choose "Local" type
4. Provide repository path and encryption settings

#### Creating an SSH Repository
1. Generate SSH keys in the "SSH Keys" section
2. Copy public key to your remote server
3. Add repository with SSH URL format:
   ```
   ssh://user@hostname:port/path/to/repo
   ```

### 2. Creating Backups

1. Select a repository
2. Click "Create Archive"
3. Specify paths to backup
4. Configure compression and exclude patterns
5. Monitor progress in real-time

### 3. Viewing Statistics

The dashboard provides:
- Storage usage breakdown
- Compression efficiency
- Deduplication statistics  
- Backup frequency trends

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `change-this-secret-key` | JWT signing key |
| `DATABASE_URL` | `sqlite:///./data/borgdash.db` | Database connection |
| `SSH_KEY_DIR` | `/app/ssh_keys` | SSH keys storage |
| `BORG_BINARY` | `borg` | Borg executable path |
| `BORG_REMOTE_PATH` | `borg-1.4` | Remote borg path |

### Volume Mounts

- `borgdash_data:/app/data` - Database and application data
- `borgdash_ssh_keys:/app/ssh_keys` - SSH key storage

### Custom Paths

To backup custom host paths, add volume mounts:

```yaml
services:
  backend:
    volumes:
      - /path/to/backup:/mnt/backup:ro
      - borgdash_data:/app/data
      - borgdash_ssh_keys:/app/ssh_keys
```

## 🏗️ Development

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/borgdash.git
   cd borgdash
   ```

2. **Start development environment:**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   
   # Frontend (new terminal)
   cd frontend
   npm install
   npm run dev
   ```

3. **Access development servers:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

### Project Structure

```
borgdash/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # REST API endpoints
│   │   ├── models/    # Data models
│   │   ├── services/  # Business logic
│   │   └── main.py    # Application entry
│   └── Dockerfile
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/     # Page components
│   │   └── services/  # API clients
│   └── Dockerfile
└── docker-compose.yaml
```

## 🔒 Security

- **SSH Keys:** Stored securely with proper file permissions
- **Database:** SQLite with file-based storage
- **API:** CORS configured for frontend domain only
- **Containers:** Run as non-root users
- **Secrets:** Environment variable based configuration

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Container health checks included
- Automatic restart on failure

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow existing code style
- Add appropriate error handling
- Update documentation
- Test with both local and SSH repositories

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Borg Backup](https://www.borgbackup.org/) - The excellent backup tool this UI manages
- [FastAPI](https://fastapi.tiangolo.com/) - High-performance Python web framework
- [React](https://reactjs.org/) - User interface library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## 📞 Support

- **Documentation:** [Project Wiki](https://github.com/yourusername/borgdash/wiki)
- **Issues:** [GitHub Issues](https://github.com/yourusername/borgdash/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/borgdash/discussions)

---

**BorgDash** - Making Borg Backup management simple and visual.