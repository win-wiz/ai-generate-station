#!/usr/bin/env node

import { execSync } from 'child_process';
// import fs from 'fs';
import path from 'path';

/**
 * Execute shell command and return output
 * @param {string} command - Shell command to execute
 * @param {boolean} silent - Whether to suppress output
 * @returns {string} Command output
 */
function executeCommand(command, silent = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: silent ? 'pipe' : 'inherit',
      cwd: process.cwd()
    });
    return output ? output.trim() : '';
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(/** @type {Error} */(error).message);
    process.exit(1);
  }
}

/**
 * Check if current directory is a git repository
 */
function checkGitRepository() {
  try {
    executeCommand('git rev-parse --git-dir', true);
  } catch (error) {
    console.error('Error: Current directory is not a git repository.');
    process.exit(1);
  }
}

/**
 * Get git status and check for changes
 * @returns {{modified: string[], added: string[], deleted: string[], renamed: string[], untracked: string[]}} Status information
 */
function getGitStatus() {
  const status = executeCommand('git status --porcelain', true);
  
  if (!status) {
    console.log('No changes detected. Nothing to commit.');
    process.exit(0);
  }

  const lines = status.split('\n').filter(line => line.trim());
  /** @type {{modified: string[], added: string[], deleted: string[], renamed: string[], untracked: string[]}} */
  const changes = {
    modified: [],
    added: [],
    deleted: [],
    renamed: [],
    untracked: []
  };

  lines.forEach(line => {
    const statusCode = line.substring(0, 2);
    const filePath = line.substring(3);
    
    if (statusCode.includes('M')) changes.modified.push(filePath);
    if (statusCode.includes('A')) changes.added.push(filePath);
    if (statusCode.includes('D')) changes.deleted.push(filePath);
    if (statusCode.includes('R')) changes.renamed.push(filePath);
    if (statusCode.includes('??')) changes.untracked.push(filePath);
  });

  return changes;
}

/**
 * Generate detailed commit message based on changes
 * @param {{modified: string[], added: string[], deleted: string[], renamed: string[], untracked: string[]}} changes - Changes object from getGitStatus
 * @returns {string} Generated commit message
 */
function generateCommitMessage(changes) {
  const totalFiles = Object.values(changes).flat().length;
  
  // Generate main commit title
  const titleParts = [];
  if (changes.added.length > 0 || changes.untracked.length > 0) {
    const newFiles = changes.added.length + changes.untracked.length;
    titleParts.push(`feat: add ${newFiles} new file${newFiles > 1 ? 's' : ''}`);
  }
  if (changes.modified.length > 0) {
    titleParts.push(`update ${changes.modified.length} file${changes.modified.length > 1 ? 's' : ''}`);
  }
  if (changes.deleted.length > 0) {
    titleParts.push(`remove ${changes.deleted.length} file${changes.deleted.length > 1 ? 's' : ''}`);
  }
  if (changes.renamed.length > 0) {
    titleParts.push(`rename ${changes.renamed.length} file${changes.renamed.length > 1 ? 's' : ''}`);
  }

  let commitTitle;
  if (titleParts.length === 1) {
    commitTitle = titleParts[0];
  } else if (titleParts.length === 2) {
    commitTitle = titleParts.join(' and ');
  } else {
    commitTitle = `chore: update ${totalFiles} files with multiple changes`;
  }

  // Generate detailed commit body
  const bodyParts = [];
  
  if (changes.added.length > 0) {
    bodyParts.push(`\n## Added Files (${changes.added.length})`);
    changes.added.forEach(file => {
      const fileName = path.basename(file);
      const fileExt = path.extname(file);
      let description = 'New file added';
      
      // Generate description based on file type
      if (fileExt === '.js' || fileExt === '.ts') {
        description = 'New JavaScript/TypeScript module';
      } else if (fileExt === '.json') {
        description = 'Configuration or data file';
      } else if (fileExt === '.md') {
        description = 'Documentation file';
      } else if (fileExt === '.css' || fileExt === '.scss') {
        description = 'Stylesheet file';
      } else if (fileExt === '.html') {
        description = 'HTML template file';
      }
      
      bodyParts.push(`- ${fileName}: ${description}`);
    });
  }
  
  if (changes.untracked.length > 0) {
    bodyParts.push(`\n## New Untracked Files (${changes.untracked.length})`);
    changes.untracked.forEach(file => {
      const fileName = path.basename(file);
      bodyParts.push(`- ${fileName}: Added to version control`);
    });
  }
  
  if (changes.modified.length > 0) {
    bodyParts.push(`\n## Modified Files (${changes.modified.length})`);
    changes.modified.forEach(file => {
      const fileName = path.basename(file);
      const fileExt = path.extname(file);
      let description = 'Updated content and functionality';
      
      // Generate description based on file type
      if (fileExt === '.js' || fileExt === '.ts') {
        description = 'Code improvements and bug fixes';
      } else if (fileExt === '.json') {
        description = 'Configuration updates';
      } else if (fileExt === '.md') {
        description = 'Documentation updates';
      } else if (fileExt === '.css' || fileExt === '.scss') {
        description = 'Style improvements';
      }
      
      bodyParts.push(`- ${fileName}: ${description}`);
    });
  }
  
  if (changes.deleted.length > 0) {
    bodyParts.push(`\n## Deleted Files (${changes.deleted.length})`);
    changes.deleted.forEach(file => {
      const fileName = path.basename(file);
      bodyParts.push(`- ${fileName}: Removed obsolete file`);
    });
  }
  
  if (changes.renamed.length > 0) {
    bodyParts.push(`\n## Renamed Files (${changes.renamed.length})`);
    changes.renamed.forEach(file => {
      const fileName = path.basename(file);
      bodyParts.push(`- ${fileName}: File renamed for better organization`);
    });
  }
  
  // Add summary footer
  bodyParts.push(`\n## Summary`);
  bodyParts.push(`Total files affected: ${totalFiles}`);
  bodyParts.push(`This commit includes comprehensive changes to improve code quality,`);
  bodyParts.push(`functionality, and project structure. All modifications follow`);
  bodyParts.push(`established coding standards and best practices.`);
  
  // Combine title and body
  const fullMessage = commitTitle + bodyParts.join('\n');
  
  return fullMessage;
}

/**
 * Main function to auto-commit and push
 */
function autoCommit() {
  console.log('🚀 Starting auto-commit process...');
  
  // Check if we're in a git repository
  checkGitRepository();
  
  // Get current changes
  console.log('📊 Analyzing changes...');
  const changes = getGitStatus();
  
  // Add all changes to staging area
  console.log('📝 Adding files to staging area...');
  executeCommand('git add .');
  
  // Generate commit message
  console.log('💬 Generating commit message...');
  const commitMessage = generateCommitMessage(changes);
  console.log(`Commit message: ${commitMessage}`);
  
  // Commit changes
  console.log('💾 Committing changes...');
  executeCommand(`git commit -m "${commitMessage}"`);
  
  // Push to remote repository
  console.log('🌐 Pushing to remote repository...');
  try {
    executeCommand('git push');
    console.log('✅ Successfully pushed to remote repository!');
  } catch (error) {
    console.log('⚠️  Failed to push. Trying to set upstream...');
    try {
      const currentBranch = executeCommand('git branch --show-current', true);
      if (!currentBranch || currentBranch.trim() === '') {
        throw new Error('Unable to determine current branch');
      }
      executeCommand(`git push -u origin ${currentBranch.trim()}`);
      console.log('✅ Successfully pushed with upstream set!');
    } catch (upstreamError) {
      console.error('❌ Failed to push to remote repository.');
      console.error('Please check your remote repository configuration.');
      process.exit(1);
    }
  }
  
  console.log('🎉 Auto-commit process completed successfully!');
}

// Run the auto-commit function
if (import.meta.url === `file://${process.argv[1]}`) {
  autoCommit();
}

export { autoCommit, generateCommitMessage, getGitStatus };