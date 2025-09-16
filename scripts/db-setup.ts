#!/usr/bin/env node

/**
 * Database setup script for AI Generate Station
 * This script initializes the database and runs necessary migrations
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const DB_FILE = join(PROJECT_ROOT, 'db.sqlite');

console.log('🚀 Setting up database for AI Generate Station...\n');

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
 * Check if database file exists
 */
function checkDatabaseExists() {
  if (existsSync(DB_FILE)) {
    console.log(`📁 Database file found at: ${DB_FILE}`);
    return true;
  } else {
    console.log(`📁 Database file will be created at: ${DB_FILE}`);
    return false;
  }
}

/**
 * Main setup function
 */
async function setupDatabase() {
  console.log('🔍 Checking database status...');
  const dbExists = checkDatabaseExists();
  
  if (!dbExists) {
    console.log('\n🆕 Creating new database...');
  } else {
    console.log('\n🔄 Updating existing database...');
  }

  // Generate migration files
  executeCommand(
    'pnpm db:generate',
    'Generating migration files'
  );

  // Push schema to database (creates tables if they don't exist)
  executeCommand(
    'pnpm db:push',
    'Applying database schema'
  );

  console.log('🎉 Database setup completed successfully!');
  console.log('\n📊 You can now:');
  console.log('  • Run `pnpm db:studio` to open Drizzle Studio');
  console.log('  • Run `pnpm dev` to start the development server');
  console.log('  • Check database health at /api/health');
}

/**
 * Verify environment
 */
function verifyEnvironment() {
  console.log('🔧 Verifying environment...');
  
  // Check if .env file exists
  const envFile = join(PROJECT_ROOT, '.env');
  if (!existsSync(envFile)) {
    console.error('❌ .env file not found!');
    console.log('📝 Please create a .env file based on .env.example');
    process.exit(1);
  }

  // Check if DATABASE_URL is set
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env file!');
    console.log('📝 Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  console.log(`✅ Environment verified`);
  console.log(`📍 Database URL: ${DATABASE_URL}\n`);
}

// Run setup
async function main() {
  try {
    verifyEnvironment();
    await setupDatabase();
  } catch (error) {
    console.error('💥 Setup failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();