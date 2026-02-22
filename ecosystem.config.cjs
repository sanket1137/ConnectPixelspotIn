// ==========================================
// PM2 ECOSYSTEM CONFIGURATION FOR PIXELSPOT
// ==========================================
// This file configures PM2 process manager for production deployment
// Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [{
    // Application name
    name: 'pixelspot',
    
    // Entry point (dist/index.js with env vars injected by PM2)
    script: './dist/index.js',
    
    // Fork mode - single instance (required for in-memory OTP storage)
    instances: 1,
    exec_mode: 'fork',
    
    // Automatic restart on crashes
    autorestart: true,
    
    // Watch for file changes (disable in production)
    watch: false,
    
    // Maximum memory before restart (prevents memory leaks)
    max_memory_restart: '1G',
    
    // Production environment variables
    // All secrets are loaded from .env.production via dotenv in server/index.ts
    // Only NODE_ENV and PORT are set here to avoid overriding .env.production
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      DOTENV_CONFIG_PATH: '.env.production'
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Restart delay on crash (milliseconds)
    restart_delay: 4000,
    
    // Minimum uptime before considered stable (milliseconds)
    min_uptime: 10000,
    
    // Maximum consecutive unstable restarts before stopping
    max_restarts: 10,
    
    // Graceful shutdown timeout (milliseconds)
    kill_timeout: 5000,
    
    // Listen for SIGINT and do graceful reload
    listen_timeout: 3000,
    
    // Merge logs from all instances
    merge_logs: true,
    
    // Additional node.js arguments
    // -r dotenv/config preloads env vars from .env.production before ESM modules
    node_args: '-r dotenv/config --max-old-space-size=2048',
    
    // Cron pattern for scheduled restarts (optional)
    // Restart daily at 4 AM to clear memory
    cron_restart: '0 4 * * *',
    
    // Source maps support
    source_map_support: true,
    
    // Environment-specific overrides
    env: {
      // Default environment
      NODE_ENV: 'development',
      PORT: 5000
    },
    
    // Staging environment (optional)
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5000
    }
  }],

  // PM2 deployment configuration (optional)
  deploy: {
    production: {
      // SSH user
      user: 'pixelspot',
      
      // Server hostname or IP
      host: 'YOUR_SERVER_IP',
      
      // SSH key path
      key: '~/.ssh/id_rsa',
      
      // Git branch
      ref: 'origin/main',
      
      // Git repository
      repo: 'https://github.com/YOUR_ORG/pixelspot.git',
      
      // Deployment path
      path: '/var/www/pixelspot',
      
      // Pre-setup commands (run once)
      'pre-setup': 'apt update && apt install -y git',
      
      // Post-setup commands (run once)
      'post-setup': 'npm install && npm run build',
      
      // Pre-deploy commands (run before each deployment)
      'pre-deploy-local': 'echo "Deploying to production..."',
      
      // Deploy commands (run on server)
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      
      // Environment
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};

// ==========================================
// USAGE INSTRUCTIONS
// ==========================================
//
// Start application:
//   pm2 start ecosystem.config.js --env production
//
// Restart application:
//   pm2 restart pixelspot
//
// Reload without downtime:
//   pm2 reload pixelspot
//
// Stop application:
//   pm2 stop pixelspot
//
// Delete from PM2:
//   pm2 delete pixelspot
//
// View logs:
//   pm2 logs pixelspot
//
// Monitor real-time:
//   pm2 monit
//
// View status:
//   pm2 status
//
// Save PM2 configuration:
//   pm2 save
//
// Setup startup script:
//   pm2 startup systemd
//   (then run the command it outputs)
//
// ==========================================
// DEPLOYMENT COMMANDS (Optional)
// ==========================================
//
// Setup deployment (first time):
//   pm2 deploy production setup
//
// Deploy application:
//   pm2 deploy production
//
// Revert to previous deployment:
//   pm2 deploy production revert 1
//
// ==========================================
// NOTES
// ==========================================
//
// 1. Cluster mode distributes load across all CPU cores
// 2. PM2 handles automatic restarts on crashes
// 3. Daily cron restart at 4 AM clears accumulated memory
// 4. Graceful reloads ensure zero downtime during updates
// 5. Logs are automatically rotated and timestamped
// 6. Memory limit prevents runaway memory leaks
//
// ==========================================
