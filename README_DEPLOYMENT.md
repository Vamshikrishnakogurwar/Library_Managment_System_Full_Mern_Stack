# LibraFlow Production Deployment Guide

This guide describes production deployment options for LibraFlow on container platforms, virtual private servers (VPS), or cloud application platforms (Render, Railway, AWS ECS, Google Cloud Run).

---

## 1. Containerized Production Build (Docker)

LibraFlow includes a multi-stage Dockerfile that builds the React frontend with Vite, compiles static assets into Express, and runs the entire stack in one container.

### Build and Run:
```bash
# Build the production image
docker build -t libraflow:latest .

# Run with environment variables pointing to Aiven Cloud MySQL
docker run -d -p 5000:5000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-aiven-host.aivencloud.com \
  -e DB_PORT=12345 \
  -e DB_NAME=defaultdb \
  -e DB_USER=avnadmin \
  -e DB_PASSWORD=your_password \
  -e DB_SSL=true \
  -e JWT_SECRET=strong_production_secret \
  --name libraflow-instance libraflow:latest
```

---

## 2. Docker Compose Deployment

To run both the application and an isolated local MySQL container:
```bash
# Start containers in background
docker compose up -d

# Check container logs
docker compose logs -f app
```

---

## 3. Cloud Database Configuration (Aiven MySQL)

1. Ensure the Aiven service has public IP access enabled or is in a configured VPC peering.
2. In production, always require TLS/SSL:
   ```env
   DB_SSL=true
   DB_SSL_CA_PATH=/app/certs/ca.pem
   ```
3. Never commit `ca.pem` certificates or `.env` files into source control repositories.

---

## 4. Health Checks and Monitoring

The backend exposes a dedicated health check endpoint:
```http
GET /health
```
**Sample Healthy Response (HTTP 200)**:
```json
{
  "status": "UP",
  "timestamp": "2026-10-02T16:40:00.000Z",
  "uptimeSeconds": 1420,
  "database": {
    "ok": true,
    "message": "Database connection successful"
  },
  "version": "1.0.0"
}
```
If the database connection is interrupted, the status returns `503 Service Unavailable` with `status: "DEGRADED"`, allowing container orchestrators (Kubernetes, AWS ECS) to restart unhealthy pods.
