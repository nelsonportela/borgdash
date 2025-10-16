# BorgDash Single Container Migration

## 🎯 What Changed

### **Before (Multi-Container):**
- ❌ Two separate images: `borgdash-backend` and `borgdash-frontend`
- ❌ Two ports: 8157 (backend) + 3157 (frontend)
- ❌ CORS configuration required
- ❌ Complex URL configuration
- ❌ Doesn't work from mobile devices

### **After (Single Container):**
- ✅ One image: `fuguone/borgdash:latest`
- ✅ One port: 3157
- ✅ No CORS issues (same origin)
- ✅ No URL configuration needed
- ✅ Works from any device (phone, tablet, laptop)

## 📦 Architecture

```
┌─────────────────────────────────────┐
│   Single Container                  │
│   fuguone/borgdash:latest          │
│                                     │
│   Port 8000                         │
│   ├── /api/*  → FastAPI Backend    │
│   └── /*      → React Frontend     │
└─────────────────────────────────────┘
         │
    Exposed as port 3157
```

## 🚀 User Experience

### **docker-compose.yaml (SIMPLE!):**
```yaml
version: '3.8'

services:
  borgdash:
    image: fuguone/borgdash:latest
    container_name: borgdash
    ports:
      - "3157:8000"
    volumes:
      - ./data:/app/data
      - ./ssh_keys:/app/host_keys
    restart: unless-stopped
```

### **Access:**
- From computer: `http://localhost:3157`
- From phone: `http://your-server-ip:3157`
- From anywhere: `http://your-server:3157`

## 🔧 Technical Implementation

### **1. Combined Dockerfile**
- Multi-stage build
- Stage 1: Build React frontend with Vite
- Stage 2: Python backend + built frontend
- Backend serves frontend static files

### **2. Updated API Routes**
- All API routes under `/api/*`
- Frontend uses relative URLs: `/api/repositories`
- No hardcoded hosts or ports

### **3. Frontend Routing**
- FastAPI serves `index.html` for SPA routes
- Static assets served directly
- No CORS needed (same origin)

## ✨ Benefits

1. **Simple Deployment**
   - One docker-compose command
   - No environment variables needed
   - No CORS configuration

2. **Works Everywhere**
   - Access from any device
   - No localhost hardcoding
   - Mobile-friendly

3. **Production Ready**
   - Industry-standard pattern
   - Clean separation of concerns
   - Easy to maintain

4. **Smaller Footprint**
   - One container instead of two
   - One image to download
   - Simpler networking

## 🔄 Migration Guide

### **For Existing Users:**
```bash
# Stop old containers
docker compose down

# Pull new single image
docker pull fuguone/borgdash:latest

# Update docker-compose.yaml (see above)

# Start new container
docker compose up -d
```

### **Data Preservation:**
- Database location unchanged: `./data/borgdash.db`
- SSH keys location unchanged: `./ssh_keys`
- No data migration needed

## 📝 Notes

- Old images `borgdash-backend` and `borgdash-frontend` are deprecated
- New releases will only publish `borgdash:latest`
- Port 3157 is the single entry point for everything
