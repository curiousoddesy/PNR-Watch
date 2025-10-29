#!/bin/bash

# Production Deployment Script for Modern PNR Frontend
# This script handles the complete deployment process with safety checks

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/dist"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if environment is provided
if [ -z "$1" ]; then
    error "Usage: $0 <environment> [options]
    
Environments:
  staging     Deploy to staging environment
  production  Deploy to production environment
  
Options:
  --skip-tests     Skip running tests
  --skip-build     Skip building (use existing build)
  --dry-run        Show what would be deployed without actually deploying
  --force          Skip confirmation prompts"
fi

ENVIRONMENT=$1
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false
FORCE=false

# Parse additional arguments
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
fi

log "Starting deployment to $ENVIRONMENT environment"

# Change to project directory
cd "$PROJECT_DIR"

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$ENVIRONMENT" == "production" && "$CURRENT_BRANCH" != "main" ]]; then
    if [[ "$FORCE" != true ]]; then
        error "Production deployments must be from 'main' branch. Current branch: $CURRENT_BRANCH"
    else
        warning "Deploying to production from non-main branch: $CURRENT_BRANCH"
    fi
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    if [[ "$FORCE" != true ]]; then
        error "There are uncommitted changes. Please commit or stash them before deploying."
    else
        warning "Deploying with uncommitted changes"
    fi
fi

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    log "Installing dependencies..."
    npm ci
fi

# Run tests unless skipped
if [[ "$SKIP_TESTS" != true ]]; then
    log "Running tests..."
    npm run test || error "Tests failed"
    
    log "Running linting..."
    npm run lint || error "Linting failed"
    
    success "All tests passed"
fi

# Build application unless skipped
if [[ "$SKIP_BUILD" != true ]]; then
    log "Building application for $ENVIRONMENT..."
    
    # Set environment variables based on deployment target
    if [[ "$ENVIRONMENT" == "production" ]]; then
        export VITE_ENVIRONMENT=production
        export VITE_API_URL=${PRODUCTION_API_URL:-"https://api.pnrtracker.com"}
        export VITE_SOCKET_URL=${PRODUCTION_SOCKET_URL:-"wss://api.pnrtracker.com"}
    else
        export VITE_ENVIRONMENT=staging
        export VITE_API_URL=${STAGING_API_URL:-"https://staging-api.pnrtracker.com"}
        export VITE_SOCKET_URL=${STAGING_SOCKET_URL:-"wss://staging-api.pnrtracker.com"}
    fi
    
    npm run build || error "Build failed"
    
    success "Build completed successfully"
fi

# Verify build directory exists
if [[ ! -d "$BUILD_DIR" ]]; then
    error "Build directory not found: $BUILD_DIR"
fi

# Run performance checks
log "Running performance checks..."
node scripts/performance-check.js || warning "Performance checks failed"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup of current deployment (if exists)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${ENVIRONMENT}_${TIMESTAMP}"

if [[ "$DRY_RUN" == true ]]; then
    log "DRY RUN: Would create backup: $BACKUP_NAME"
    log "DRY RUN: Would deploy files from: $BUILD_DIR"
    log "DRY RUN: Deployment target: $ENVIRONMENT"
    exit 0
fi

# Confirmation prompt for production
if [[ "$ENVIRONMENT" == "production" && "$FORCE" != true ]]; then
    echo
    echo -e "${YELLOW}⚠️  PRODUCTION DEPLOYMENT${NC}"
    echo "You are about to deploy to PRODUCTION environment."
    echo "Current branch: $CURRENT_BRANCH"
    echo "Build directory: $BUILD_DIR"
    echo
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
fi

# Deployment logic based on environment
log "Starting deployment..."

case $ENVIRONMENT in
    staging)
        deploy_to_staging
        ;;
    production)
        deploy_to_production
        ;;
esac

# Post-deployment verification
log "Running post-deployment verification..."
verify_deployment

success "Deployment to $ENVIRONMENT completed successfully!"

# Deployment functions
deploy_to_staging() {
    log "Deploying to staging environment..."
    
    # Example deployment commands - customize based on your infrastructure
    # AWS S3 + CloudFront
    if command -v aws &> /dev/null; then
        log "Syncing files to S3..."
        aws s3 sync "$BUILD_DIR" s3://staging-pnr-frontend --delete
        
        log "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id "$STAGING_CLOUDFRONT_ID" --paths "/*"
    fi
    
    # Or Netlify
    if command -v netlify &> /dev/null; then
        log "Deploying to Netlify..."
        netlify deploy --prod --dir="$BUILD_DIR" --site="$STAGING_SITE_ID"
    fi
    
    # Or custom server via rsync
    if [[ -n "$STAGING_SERVER" ]]; then
        log "Syncing to staging server..."
        rsync -avz --delete "$BUILD_DIR/" "$STAGING_SERVER:/var/www/pnr-frontend/"
    fi
}

deploy_to_production() {
    log "Deploying to production environment..."
    
    # Create backup first
    if [[ -n "$PRODUCTION_SERVER" ]]; then
        log "Creating backup of current production deployment..."
        ssh "$PRODUCTION_SERVER" "tar -czf /backups/$BACKUP_NAME.tar.gz -C /var/www pnr-frontend"
    fi
    
    # AWS S3 + CloudFront
    if command -v aws &> /dev/null; then
        log "Syncing files to S3..."
        aws s3 sync "$BUILD_DIR" s3://production-pnr-frontend --delete
        
        log "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id "$PRODUCTION_CLOUDFRONT_ID" --paths "/*"
    fi
    
    # Or Netlify
    if command -v netlify &> /dev/null; then
        log "Deploying to Netlify..."
        netlify deploy --prod --dir="$BUILD_DIR" --site="$PRODUCTION_SITE_ID"
    fi
    
    # Or custom server via rsync
    if [[ -n "$PRODUCTION_SERVER" ]]; then
        log "Syncing to production server..."
        rsync -avz --delete "$BUILD_DIR/" "$PRODUCTION_SERVER:/var/www/pnr-frontend/"
        
        # Restart web server if needed
        ssh "$PRODUCTION_SERVER" "sudo systemctl reload nginx"
    fi
}

verify_deployment() {
    local url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        url=${PRODUCTION_URL:-"https://pnrtracker.com"}
    else
        url=${STAGING_URL:-"https://staging.pnrtracker.com"}
    fi
    
    log "Verifying deployment at: $url"
    
    # Check if site is accessible
    if command -v curl &> /dev/null; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        if [[ "$HTTP_STATUS" == "200" ]]; then
            success "Site is accessible (HTTP $HTTP_STATUS)"
        else
            error "Site returned HTTP $HTTP_STATUS"
        fi
        
        # Check if service worker is available
        SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url/sw.js")
        if [[ "$SW_STATUS" == "200" ]]; then
            success "Service worker is available"
        else
            warning "Service worker not found (HTTP $SW_STATUS)"
        fi
    fi
    
    # Run basic smoke tests
    if command -v npx &> /dev/null; then
        log "Running smoke tests..."
        # Add your smoke test commands here
        # npx playwright test --grep="smoke"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    # Add cleanup commands here if needed
}

# Set trap for cleanup on exit
trap cleanup EXIT