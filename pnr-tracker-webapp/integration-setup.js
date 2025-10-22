#!/usr/bin/env node

/**
 * Integration Setup Script
 * Ensures all components are properly connected and configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IntegrationSetup {
  constructor() {
    this.projectRoot = __dirname;
    this.backendPath = path.join(this.projectRoot, 'backend');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  checkFileExists(filePath, description) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing ${description}: ${filePath}`);
    }
    this.log(`Found ${description}`, 'success');
  }

  createEnvFiles() {
    this.log('Setting up environment files...');

    // Backend .env
    const backendEnvPath = path.join(this.backendPath, '.env');
    if (!fs.existsSync(backendEnvPath)) {
      const backendEnvExample = path.join(this.backendPath, '.env.example');
      if (fs.existsSync(backendEnvExample)) {
        fs.copyFileSync(backendEnvExample, backendEnvPath);
        this.log('Created backend .env from example');
      }
    }

    // Frontend .env
    const frontendEnvPath = path.join(this.frontendPath, '.env');
    if (!fs.existsSync(frontendEnvPath)) {
      const frontendEnvExample = path.join(this.frontendPath, '.env.example');
      if (fs.existsSync(frontendEnvExample)) {
        fs.copyFileSync(frontendEnvExample, frontendEnvPath);
        this.log('Created frontend .env from example');
      }
    }
  }

  checkDependencies() {
    this.log('Checking dependencies...');

    // Check if node_modules exist
    const rootNodeModules = path.join(this.projectRoot, 'node_modules');
    const backendNodeModules = path.join(this.backendPath, 'node_modules');
    const frontendNodeModules = path.join(this.frontendPath, 'node_modules');

    if (!fs.existsSync(rootNodeModules)) {
      this.log('Installing root dependencies...');
      execSync('npm install', { cwd: this.projectRoot, stdio: 'inherit' });
    }

    if (!fs.existsSync(backendNodeModules)) {
      this.log('Installing backend dependencies...');
      execSync('npm install', { cwd: this.backendPath, stdio: 'inherit' });
    }

    if (!fs.existsSync(frontendNodeModules)) {
      this.log('Installing frontend dependencies...');
      execSync('npm install', { cwd: this.frontendPath, stdio: 'inherit' });
    }
  }

  validateConfiguration() {
    this.log('Validating configuration...');

    // Check essential files
    this.checkFileExists(path.join(this.backendPath, 'src', 'index.ts'), 'Backend entry point');
    this.checkFileExists(path.join(this.frontendPath, 'src', 'main.tsx'), 'Frontend entry point');
    this.checkFileExists(path.join(this.backendPath, 'package.json'), 'Backend package.json');
    this.checkFileExists(path.join(this.frontendPath, 'package.json'), 'Frontend package.json');

    // Check TypeScript configs
    this.checkFileExists(path.join(this.backendPath, 'tsconfig.json'), 'Backend TypeScript config');
    this.checkFileExists(path.join(this.frontendPath, 'tsconfig.json'), 'Frontend TypeScript config');

    // Check build configs
    this.checkFileExists(path.join(this.frontendPath, 'vite.config.ts'), 'Vite config');
    this.checkFileExists(path.join(this.backendPath, 'vitest.config.ts'), 'Vitest config');
  }

  checkDatabaseSetup() {
    this.log('Checking database setup...');

    const migrationsPath = path.join(this.backendPath, 'src', 'migrations');
    if (!fs.existsSync(migrationsPath)) {
      throw new Error('Database migrations directory not found');
    }

    const migrationFiles = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
    if (migrationFiles.length === 0) {
      throw new Error('No database migration files found');
    }

    this.log(`Found ${migrationFiles.length} migration files`, 'success');
  }

  testBuild() {
    this.log('Testing build process...');

    try {
      // Test backend build
      this.log('Building backend...');
      execSync('npm run build', { cwd: this.backendPath, stdio: 'pipe' });
      this.log('Backend build successful', 'success');

      // Test frontend build
      this.log('Building frontend...');
      execSync('npm run build', { cwd: this.frontendPath, stdio: 'pipe' });
      this.log('Frontend build successful', 'success');

    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  createIntegrationChecklist() {
    const checklist = `
# Integration Checklist

## ✅ Completed Setup Tasks

- [x] Environment files created
- [x] Dependencies installed
- [x] Configuration validated
- [x] Database migrations available
- [x] Build process tested

## 🔧 Manual Setup Required

### Database Setup
1. Install PostgreSQL
2. Create database: \`createdb pnr_tracker\`
3. Update DATABASE_URL in backend/.env
4. Run migrations: \`npm run migrate:up\` in backend/

### Redis Setup (Optional for caching)
1. Install Redis
2. Update REDIS_URL in backend/.env

### Email Configuration (For notifications)
1. Configure SMTP settings in backend/.env
2. For Gmail: Use app-specific password

### Push Notifications (Optional)
1. Generate VAPID keys: \`npx web-push generate-vapid-keys\`
2. Update VAPID keys in both backend/.env and frontend/.env

## 🚀 Running the Application

### Development Mode
\`\`\`bash
# Run both frontend and backend
npm run dev

# Or run separately
npm run dev:backend
npm run dev:frontend
\`\`\`

### Production Mode
\`\`\`bash
# Build both applications
npm run build

# Start backend
cd backend && npm start

# Serve frontend (use nginx or similar)
\`\`\`

## 🧪 Testing

### Run Integration Tests
\`\`\`bash
node e2e-integration-test.js
\`\`\`

### Run Unit Tests
\`\`\`bash
npm test
\`\`\`

## 📋 Verification Steps

1. Backend health check: http://localhost:3001/health
2. Frontend access: http://localhost:5173
3. API endpoints working: http://localhost:3001/api/monitoring/health
4. WebSocket connection established
5. Database connectivity verified
6. User registration and login working
7. PNR management functionality working
8. Notifications system operational

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**: Change PORT in backend/.env
2. **Database connection**: Verify DATABASE_URL
3. **CORS issues**: Check frontend URL in backend CORS config
4. **Build failures**: Check TypeScript errors
5. **Missing dependencies**: Run \`npm install\` in all directories

### Logs Location
- Backend logs: backend/logs/
- Frontend console: Browser developer tools
`;

    fs.writeFileSync(path.join(this.projectRoot, 'INTEGRATION_CHECKLIST.md'), checklist);
    this.log('Created integration checklist', 'success');
  }

  async run() {
    try {
      this.log('Starting integration setup...');

      this.createEnvFiles();
      this.checkDependencies();
      this.validateConfiguration();
      this.checkDatabaseSetup();
      this.testBuild();
      this.createIntegrationChecklist();

      this.log('Integration setup completed successfully!', 'success');
      this.log('Next steps:');
      this.log('1. Review INTEGRATION_CHECKLIST.md');
      this.log('2. Set up database and configure .env files');
      this.log('3. Run: npm run dev');
      this.log('4. Test with: node e2e-integration-test.js');

      return true;

    } catch (error) {
      this.log(`Integration setup failed: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new IntegrationSetup();
  
  setup.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationSetup;