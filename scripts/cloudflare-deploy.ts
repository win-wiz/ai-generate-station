#!/usr/bin/env node

/**
 * Cloudflare Pages deployment script
 * This script handles the complete deployment process to Cloudflare Pages
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const PROJECT_ROOT = process.cwd();

console.log('🚀 Starting Cloudflare Pages deployment...\n');

/**
 * Execute command with error handling
 */
function executeCommand(command: string, description: string) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: PROJECT_ROOT });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Create Cloudflare-specific environment file
 */
function createCloudflareEnv() {
  console.log('📝 Creating Cloudflare environment configuration...');
  
  const cloudflareEnv = `# Cloudflare Pages Environment
NODE_ENV=production
DATABASE_URL=d1-remote
NEXTAUTH_URL=${process.env.NEXTAUTH_URL || 'https://your-domain.pages.dev'}
AUTH_SECRET=${process.env.AUTH_SECRET || ''}
AUTH_GITHUB_ID=${process.env.AUTH_GITHUB_ID || ''}
AUTH_GITHUB_SECRET=${process.env.AUTH_GITHUB_SECRET || ''}
`;

  writeFileSync(join(PROJECT_ROOT, '.env.cloudflare'), cloudflareEnv);
  console.log('✅ Cloudflare environment configuration created\n');
}

/**
 * Build for Cloudflare Pages
 */
function buildForCloudflare() {
  console.log('🔨 Building for Cloudflare Pages...');
  
  // Set environment for Cloudflare build
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'd1-remote';
  
  // Use Cloudflare-specific Next.js config
  executeCommand(
    'cp next.config.cloudflare.js next.config.js.backup && cp next.config.cloudflare.js next.config.js',
    'Switching to Cloudflare configuration'
  );
  
  try {
    // Build with Next.js
    executeCommand('npm run build', 'Building Next.js application');
    
    // Build with @cloudflare/next-on-pages
    executeCommand('npx @cloudflare/next-on-pages', 'Converting to Cloudflare Pages format');
    
  } finally {
    // Restore original config
    if (existsSync('next.config.js.backup')) {
      executeCommand('mv next.config.js.backup next.config.js', 'Restoring original configuration');
    }
  }
}

/**
 * Deploy to Cloudflare Pages
 */
function deployToCloudflare() {
  console.log('🚀 Deploying to Cloudflare Pages...');
  
  // Check if wrangler is configured
  try {
    execSync('wrangler whoami', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Wrangler not authenticated. Please run: wrangler login');
    process.exit(1);
  }
  
  // Deploy to Cloudflare Pages
  executeCommand(
    'wrangler pages deploy .vercel/output/static --project-name=ai-generate-station',
    'Deploying to Cloudflare Pages'
  );
}

/**
 * Setup D1 database
 */
function setupD1Database() {
  console.log('🗄️ Setting up D1 database...');
  
  try {
    // Create D1 database if it doesn't exist
    executeCommand(
      'wrangler d1 create ai-generate-station-db',
      'Creating D1 database (if not exists)'
    );
    
    // Run migrations
    executeCommand(
      'wrangler d1 migrations apply ai-generate-station-db',
      'Applying database migrations'
    );
    
  } catch (error) {
    console.log('ℹ️ Database might already exist, continuing...');
  }
}

/**
 * Main deployment function
 */
async function main() {
  try {
    console.log('🔍 Verifying environment...');
    
    // Check required files
    const requiredFiles = ['wrangler.toml', 'next.config.cloudflare.js'];
    for (const file of requiredFiles) {
      if (!existsSync(join(PROJECT_ROOT, file))) {
        console.error(`❌ Required file not found: ${file}`);
        process.exit(1);
      }
    }
    
    console.log('✅ Environment verified\n');
    
    // Create Cloudflare environment
    createCloudflareEnv();
    
    // Setup D1 database
    setupD1Database();
    
    // Build for Cloudflare
    buildForCloudflare();
    
    // Deploy to Cloudflare Pages
    deployToCloudflare();
    
    console.log('🎉 Deployment completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('  • Check your deployment at Cloudflare Pages dashboard');
    console.log('  • Configure custom domain if needed');
    console.log('  • Set up environment variables in Cloudflare dashboard');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();