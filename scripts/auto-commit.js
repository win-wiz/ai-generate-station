#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
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
 * Generate commit message based on changes
 * @param {{modified: string[], added: string[], deleted: string[], renamed: string[], untracked: string[]}} changes - Changes object from getGitStatus
 * @returns {string} Generated commit message
 */
function generateCommitMessage(changes) {
  const messages = [];
  
  // Count total changes
  const totalFiles = Object.values(changes).flat().length;
  
  // Generate summary based on change types
  if (changes.added.length > 0) {
    messages.push(`Add ${changes.added.length} new file${changes.added.length > 1 ? 's' : ''}`);
  }
  
  if (changes.modified.length > 0) {
    messages.push(`Update ${changes.modified.length} file${changes.modified.length > 1 ? 's' : ''}`);
  }
  
  if (changes.deleted.length > 0) {
    messages.push(`Remove ${changes.deleted.length} file${changes.deleted.length > 1 ? 's' : ''}`);
  }
  
  if (changes.renamed.length > 0) {
    messages.push(`Rename ${changes.renamed.length} file${changes.renamed.length > 1 ? 's' : ''}`);
  }
  
  if (changes.untracked.length > 0) {
    messages.push(`Add ${changes.untracked.length} untracked file${changes.untracked.length > 1 ? 's' : ''}`);
  }

  // Create main commit message
  let commitMessage;
  if (messages.length === 1) {
    commitMessage = messages[0];
  } else if (messages.length === 2) {
    commitMessage = messages.join(' and ');
  } else {
    commitMessage = `Update ${totalFiles} files with multiple changes`;
  }

  // Add file details if reasonable number of files
  if (totalFiles <= 5) {
    const allFiles = Object.values(changes).flat();
    const fileList = allFiles.map(file => path.basename(file)).join(', ');
    commitMessage += `\n\nFiles: ${fileList}`;
  }

  return commitMessage;
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
      if (!currentBranch) {
        throw new Error('Unable to determine current branch');
      }
      executeCommand(`git push -u origin ${currentBranch}`);
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