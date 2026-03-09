# SAMVAAD AI Backend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production stage
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r samvaad && useradd -r -g samvaad samvaad

# Copy Python packages from builder
COPY --from=builder /root/.local /home/samvaad/.local

# Copy application code
COPY --chown=samvaad:samvaad . .

# Set PATH for user-installed packages
ENV PATH=/home/samvaad/.local/bin:$PATH

# Switch to non-root user
USER samvaad

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Run the application — use $PORT from Railway, default to 8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4
