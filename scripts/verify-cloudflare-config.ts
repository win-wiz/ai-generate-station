#!/usr/bin/env node

/**
 * Cloudflare configuration verification script
 * This script validates the project configuration for Cloudflare Pages deployment
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const PROJECT_ROOT = process.cwd();

console.log('🔍 Verifying Cloudflare Pages configuration...\n');

interface ValidationResult {
  passed: boolean;
  message: string;
  suggestion?: string;
}

/**
 * Validation checks
 */
const validations: Array<() => ValidationResult> = [
  // Check required files
  () => {
    const requiredFiles = [
      'wrangler.toml',
      'next.config.cloudflare.js',
      '_headers',
      '_redirects',
      'src/types/cloudflare.ts'
    ];
    
    const missingFiles = requiredFiles.filter(file => !existsSync(join(PROJECT_ROOT, file)));
    
    if (missingFiles.length > 0) {
      return {
        passed: false,
        message: `Missing required files: ${missingFiles.join(', ')}`,
        suggestion: 'Run the setup script to create missing files'
      };
    }
    
    return {
      passed: true,
      message: 'All required files present'
    };
  },

  // Check wrangler.toml configuration
  () => {
    try {
      const wranglerConfig = readFileSync(join(PROJECT_ROOT, 'wrangler.toml'), 'utf-8');
      
      // Check for required configurations
      const requiredConfigs = ['name', 'compatibility_date', 'pages_build_output_dir'];
      const missingConfigs = requiredConfigs.filter(config => !wranglerConfig.includes(config));
      
      if (missingConfigs.length > 0) {
        return {
          passed: false,
          message: `Missing required configurations: ${missingConfigs.join(', ')}`,
          suggestion: 'Add missing configurations to wrangler.toml'
        };
      }
      
      // Check for problematic duplicate keys in the same section
      const lines = wranglerConfig.split('\n');
      let currentSection = '';
      const sectionKeys = new Map<string, Set<string>>();
      const duplicates: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Track current section
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentSection = trimmed;
          if (!sectionKeys.has(currentSection)) {
            sectionKeys.set(currentSection, new Set());
          }
          continue;
        }
        
        // Check for key-value pairs
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const key = trimmed.split('=')?.[0]?.trim() || '';
          const sectionKeySet = sectionKeys.get(currentSection) || new Set();
          
          if (sectionKeySet.has(key)) {
            duplicates.push(`${key} in ${currentSection || 'root'}`);
          }
          sectionKeySet.add(key);
          sectionKeys.set(currentSection, sectionKeySet);
        }
      }
      
      if (duplicates.length > 0) {
        return {
          passed: false,
          message: `Duplicate keys in same section: ${duplicates.join(', ')}`,
          suggestion: 'Remove duplicate configuration keys within the same section'
        };
      }
      
      return {
        passed: true,
        message: 'wrangler.toml configuration valid'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to read wrangler.toml: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: 'Check if wrangler.toml exists and is readable'
      };
    }
  },

  // Check package.json scripts
  () => {
    try {
      const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      
      const requiredScripts = ['build:cf', 'pages:build', 'pages:deploy'];
      const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
      
      if (missingScripts.length > 0) {
        return {
          passed: false,
          message: `Missing required scripts: ${missingScripts.join(', ')}`,
          suggestion: 'Add missing scripts to package.json'
        };
      }
      
      // Check for required dependencies
      const requiredDeps = ['@cloudflare/next-on-pages', 'wrangler'];
      const missingDeps = requiredDeps.filter(dep => 
        !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
      );
      
      if (missingDeps.length > 0) {
        return {
          passed: false,
          message: `Missing required dependencies: ${missingDeps.join(', ')}`,
          suggestion: 'Install missing dependencies with npm install'
        };
      }
      
      return {
        passed: true,
        message: 'package.json configuration valid'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: 'Check if package.json exists and is valid JSON'
      };
    }
  },

  // Check environment variables
  () => {
    const requiredEnvVars = ['AUTH_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      return {
        passed: false,
        message: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
        suggestion: 'Set missing environment variables in .env file'
      };
    }
    
    return {
      passed: true,
      message: 'Environment variables configured'
    };
  },

  // Check Next.js configuration
  () => {
    try {
      const nextConfigExists = existsSync(join(PROJECT_ROOT, 'next.config.cloudflare.js'));
      
      if (!nextConfigExists) {
        return {
          passed: false,
          message: 'Cloudflare-specific Next.js configuration missing',
          suggestion: 'Create next.config.cloudflare.js file'
        };
      }
      
      const nextConfig = readFileSync(join(PROJECT_ROOT, 'next.config.cloudflare.js'), 'utf-8');
      
      // Check for required configurations
      const requiredConfigs = ['output: \'export\'', 'unoptimized: true', 'trailingSlash: true'];
      const missingConfigs = requiredConfigs.filter(config => !nextConfig.includes(config.split(':')?.[0] ?? ''));
      
      if (missingConfigs.length > 0) {
        return {
          passed: false,
          message: `Missing Next.js configurations: ${missingConfigs.join(', ')}`,
          suggestion: 'Update next.config.cloudflare.js with required settings'
        };
      }
      
      return {
        passed: true,
        message: 'Next.js configuration valid for Cloudflare Pages'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to validate Next.js configuration: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: 'Check Next.js configuration files'
      };
    }
  },

  // Check database configuration
  () => {
    try {
      const dbIndexExists = existsSync(join(PROJECT_ROOT, 'src/server/db/index.ts'));
      
      if (!dbIndexExists) {
        return {
          passed: false,
          message: 'Database configuration file missing',
          suggestion: 'Create src/server/db/index.ts file'
        };
      }
      
      const dbConfig = readFileSync(join(PROJECT_ROOT, 'src/server/db/index.ts'), 'utf-8');
      
      // Check for D1 support
      if (!dbConfig.includes('drizzleD1') || !dbConfig.includes('D1Database')) {
        return {
          passed: false,
          message: 'Database configuration missing D1 support',
          suggestion: 'Update database configuration to support Cloudflare D1'
        };
      }
      
      return {
        passed: true,
        message: 'Database configuration supports Cloudflare D1'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to validate database configuration: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: 'Check database configuration files'
      };
    }
  }
];

/**
 * Run all validations
 */
function runValidations() {
  let allPassed = true;
  const results: ValidationResult[] = [];
  
  for (const validation of validations) {
    const result = validation();
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
      if (result.suggestion) {
        console.log(`   💡 ${result.suggestion}`);
      }
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All validations passed! Your project is ready for Cloudflare Pages deployment.');
    console.log('\n📋 Next steps:');
    console.log('  1. Run: npm run build:cf');
    console.log('  2. Run: npm run pages:deploy');
    console.log('  3. Configure environment variables in Cloudflare dashboard');
  } else {
    console.log('⚠️  Some validations failed. Please fix the issues above before deploying.');
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  try {
    runValidations();
  } catch (error) {
    console.error('💥 Validation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();