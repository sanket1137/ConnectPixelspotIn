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
    // Note: These override .env.production file
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      BASE_URL: 'https://connect.pixelspot.in',
      DATABASE_URL: 'postgresql://pixelspot_user:PixelSpot2025!Secure@localhost:5432/connectpixelspot?sslmode=disable',
      VITE_FIREBASE_API_KEY: 'AIzaSyC5SM1bjIyRBroAC9l8lK5y_ngYzGBjERs',
      VITE_FIREBASE_AUTH_DOMAIN: 'pixelspot-f4010.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'pixelspot-f4010',
      VITE_FIREBASE_STORAGE_BUCKET: 'pixelspot-f4010.firebasestorage.app',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '528523451859',
      VITE_FIREBASE_APP_ID: '1:528523451859:web:107d343375979461646326',
      FIREBASE_PROJECT_ID: 'pixelspot-f4010',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDprR2TLKVPPaot\n+L1iqKqNdm9HoB4RphDS2P3DncIfk/Ks8mLwZdZ/whIFNlWCf+J0FJOBmyh3TQNU\nMXoxhWayO4y5dLuKMl5HrEcrCyn3bTj1aK6NmFK76btKa5m0F8sE9PIVP2c7/v2G\np4m1UXU3XCCn4oSBsj1PyuD+mPYXnbQJiRlvMy3CnQb0BFysxcD+f0K5T/1+bWJR\nZMipsst5qaFFdGzGnwuUiBP9CFgI5MIlMOwiChH0b/ycWnnUPGcNy1Zzaz8vJdEH\nuzvGiNiYCL9k3elfrdWi86cQVfAah/SIJnPS1MHOprQvLXNkmrr2TqIR9hx8zIlG\nrGtDaMxZAgMBAAECggEAAtN+zDMB6FKP+nibzMPKtUWJjMGXX4IFSdGJRyqDKKfc\ny2Hul6b5qEen+WNp9xc2HU6K5qpCW+gE6mmjR1JMVstA1VTfuEkJ6h6/qRn8VtNd\nuR0cIFcHaCGoa9rfi+WuRUfznhVrWZbIyO5BjH142BOviuxCy0FFO8/xtu6RamFu\nWmThsaYFhQXNQNJ/GGXeIQtU7Y1+ATBaQhuZSMBK7ujW6+nkVmO+53sU7JGt6FyD\nkgsVX8Zh+JnmKEJ998UVY8Y6WAOJDzYEplKtDZdPm8KYbT9CPRLRHnA8xrN7c6zN\nP6JYxPGLk49wzJHboEaZrgHc8Kh17/hEiFE5wxUO8QKBgQD+aGy3iYKpawFNCEaz\nOTWweTp8lWDgew3quHOJKUVCPxjQS5fiiQiJBNoHT2vFtUjWnUjQjAQGWaA1T7aG\nZIzy1z/csGMFljw2LMyXouZEQurAFnBMBDhUipi2CxnSCLRIaNbkbydk9jzfAKQG\nucNys/MEQ9rJb5iO18JLSvCS6QKBgQDrI3pCelndRJHoTw55KPeHm0i9S7n3C5L/\nyRy5MQgFbdS8i/Kp4dXhUoVDk3UYWV4C2PbzdiCci8t0ujPijo2xDzmFtvWhUIpf\nHYWXqJ/kC2mYKno3JhGutsgeii1+YyKf6QUQcjsQBfz0OYH5Ho4kahH+nFwhnjwC\n9vdXYgUn8QKBgQCTCtojbuhFcaKL2oe6mQtuF3N1hIU82gLeMoQct+ze8EcwRTDh\nb2CuiU5XQVFCMZiK6temKfc9kFnn1k3h+YX56e1wacah+QaOLXCHCFFdDOxP3+hC\nF4JTYtQHC/19hyhkXawu1gwH78aZAe7MMFxGFLoWMf3nxYeAsDYNfJ/12QKBgGwV\nscRPE3HHbD5Z4LBG6YlXEteYsJHjqx2Sp3ZlGGfOdaR5vADlA3iAgytt47xej/1F\nGDcPTKxJAivUz7bLikwiUHGriTsul3xjSJ5O77hWmqJMnEMvZ59k+5Y2M/VNwoO5\nDA/kQkv6RK1KpfkKV5Jbg4wC+cKmRrWiKk3ri60xAoGALjdzpoLCxtT18slqK2Nc\nwz5liGQirNf8fOIjJSxDSf7lcQPabf7IFU4YjbKtf2ibA32zHxn0sevqF2qCApCi\nPdfqEgMpzBRVVKmVlGDaWCZUzUT4l1vCrtNFZvv0r6y3iVA34YGBgmDGn/ekuGiZ\nJIkwVIzksm4RaepfIxoVc60=\n-----END PRIVATE KEY-----\n',
      FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk-fbsvc@pixelspot-f4010.iam.gserviceaccount.com',
      AWS_ACCESS_KEY_ID: 'AKIARSDDW6TI36D3GB2T',
      AWS_SECRET_ACCESS_KEY: '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',
      AWS_SES_SMTP_USER: 'AKIARSDDW6TI3RUCF53E',
      AWS_SES_SMTP_PASSWORD: 'BAyKzj3AOQkrnXB4HCNQIahKpDthsU4/vHon12z7g2wf',
      AWS_SES_FROM_EMAIL: 'noreply@pixelspot.in',
      AWS_SES_REGION: 'ap-south-1',
      COMBIRDS_API_KEY: '0a996da85fd9461d80ff9c3c1c732de8',
      COMBIRDS_USER_ID: 'hp@justsigns.co.in',
      COMBIRDS_PASSWORD: '87288546',
      COMBIRDS_HEADER: 'EDUMRC',
      VITE_GOOGLE_MAPS_API_KEY: 'AIzaSyCfiSS-fokH072eYcZaaM8Z0exr8gH2RAY',
      OPENAI_API_KEY: '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',
      SESSION_SECRET: 'H4bd0aPZxPAdUEMYVaRbj8WVTyPEp9umKHAyYK3C6DCnrnbrmHJR2ekHeoXByCFb2XwL8BrpvIfl3l0cvPTV0Q==',
      GOOGLE_CLOUD_PROJECT_ID: 'pixelspot-f4010',
      GOOGLE_CLOUD_BUCKET_NAME: 'pixelspot-uploads'
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
    node_args: '--max-old-space-size=2048',
    
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
