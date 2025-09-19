#!/usr/bin/env node

/**
 * Cloudflare-specific build script
 * This script handles the build process with proper environment setup
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const PROJECT_ROOT = process.cwd();

console.log('🔨 Building for Cloudflare Pages...\n');

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
 * Switch to Cloudflare configuration
 */
function switchToCloudflareConfig() {
  const originalConfig = join(PROJECT_ROOT, 'next.config.js');
  const cloudflareConfig = join(PROJECT_ROOT, 'next.config.cloudflare.js');
  const backupConfig = join(PROJECT_ROOT, 'next.config.js.backup');
  
  if (existsSync(originalConfig)) {
    copyFileSync(originalConfig, backupConfig);
    console.log('📋 Backed up original Next.js config');
  }
  
  if (existsSync(cloudflareConfig)) {
    copyFileSync(cloudflareConfig, originalConfig);
    console.log('📋 Switched to Cloudflare Next.js config');
  }
}

/**
 * Restore original configuration
 */
function restoreOriginalConfig() {
  const originalConfig = join(PROJECT_ROOT, 'next.config.js');
  const backupConfig = join(PROJECT_ROOT, 'next.config.js.backup');
  
  if (existsSync(backupConfig)) {
    copyFileSync(backupConfig, originalConfig);
    unlinkSync(backupConfig);
    console.log('📋 Restored original Next.js config');
  }
}

/**
 * Main build function
 */
async function main() {
  try {
    // Set environment variables for Cloudflare build
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'd1-remote';
    process.env.SKIP_ENV_VALIDATION = 'true';
    
    console.log('🔧 Environment setup:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}\n`);
    
    // Switch to Cloudflare configuration
    switchToCloudflareConfig();
    
    try {
      // Build with Next.js
      executeCommand('next build', 'Building Next.js application');
      
      // Convert to Cloudflare Pages format
      executeCommand('npx @cloudflare/next-on-pages', 'Converting to Cloudflare Pages format');
      
      console.log('🎉 Cloudflare build completed successfully!');
      console.log('\n📊 Build output:');
      console.log('  • Static files: .vercel/output/static');
      console.log('  • Ready for deployment with: wrangler pages deploy .vercel/output/static');
      
    } finally {
      // Always restore original configuration
      restoreOriginalConfig();
    }
    
  } catch (error) {
    console.error('💥 Build failed:', error instanceof Error ? error.message : String(error));
    restoreOriginalConfig();
    process.exit(1);
  }
}

main();