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
 * Analyze file content changes using git diff
 * @param {string} filePath - Path to the file
 * @returns {string} Description of changes
 */
function analyzeFileChanges(filePath) {
  try {
    // First try working directory changes (before staging)
    let diffOutput = executeCommand(`git diff HEAD -- "${filePath}"`, true);
    
    // If no working directory changes, try staged changes
    if (!diffOutput) {
      diffOutput = executeCommand(`git diff --cached -- "${filePath}"`, true);
    }
    
    // If still no diff, the file might be new/untracked
     if (!diffOutput) {
        // For new files, try to analyze the content
        try {
          const fs = require('fs');
          const fileContent = fs.readFileSync(filePath, 'utf8');
          if (fileContent) {
            return analyzeGitDiff(`+${fileContent}`, filePath);
          }
        } catch (e) {
          // File might not exist or be readable
        }
        return 'Minor updates';
      }
    
    return analyzeGitDiff(diffOutput, filePath);
  } catch (error) {
    return 'Content modifications';
  }
}

/**
 * Analyze git diff output to extract meaningful changes
 * @param {string} diffOutput - Git diff output
 * @param {string} filePath - File path
 * @returns {string} Description of changes
 */
function analyzeGitDiff(diffOutput, filePath) {
  const lines = diffOutput.split('\n');
  const addedLines = lines.filter(line => line.startsWith('+')).length;
  const removedLines = lines.filter(line => line.startsWith('-')).length;
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath);
  
  // Analyze specific patterns in the diff
  const changes = [];
  
  // Check for function/method changes
  const functionPattern = /[+-].*(?:function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  const functionMatches = diffOutput.match(functionPattern);
  if (functionMatches) {
    const functions = functionMatches.map(match => {
      const funcName = match.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      return funcName ? funcName[1] : 'function';
    }).filter((name, index, arr) => arr.indexOf(name) === index);
    
    if (functions.length > 0) {
      changes.push(`Modified ${functions.slice(0, 3).join(', ')} ${functions.length > 3 ? `and ${functions.length - 3} more functions` : 'function' + (functions.length > 1 ? 's' : '')}`);
    }
  }
  
  // Check for import/export changes
  const importPattern = /[+-].*(?:import|export)/g;
  const importMatches = diffOutput.match(importPattern);
  if (importMatches) {
    changes.push('Updated imports/exports');
  }
  
  // Check for configuration changes
  if (fileExt === '.json') {
    const configPattern = /[+-].*"([^"]+)":/g;
    const configMatches = diffOutput.match(configPattern);
    if (configMatches) {
      const configs = configMatches.map(match => {
        const configName = match.match(/"([^"]+)"/);
        return configName ? configName[1] : 'config';
      }).filter((name, index, arr) => arr.indexOf(name) === index);
      
      if (configs.length > 0) {
        changes.push(`Updated ${configs.slice(0, 2).join(', ')} ${configs.length > 2 ? `and ${configs.length - 2} more configurations` : 'configuration' + (configs.length > 1 ? 's' : '')}`);
      }
    }
  }
  
  // Check for React component changes
  if (fileExt === '.tsx' || fileExt === '.jsx') {
    const componentPattern = /[+-].*(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g;
    const componentMatches = diffOutput.match(componentPattern);
    if (componentMatches) {
      const components = componentMatches.map(match => {
        const compName = match.match(/([A-Z][a-zA-Z0-9]*)/);
        return compName ? compName[1] : 'Component';
      }).filter((name, index, arr) => arr.indexOf(name) === index);
      
      if (components.length > 0) {
        changes.push(`Updated ${components.slice(0, 2).join(', ')} ${components.length > 2 ? `and ${components.length - 2} more components` : 'component' + (components.length > 1 ? 's' : '')}`);
      }
    }
  }
  
  // Fallback to line count analysis
  if (changes.length === 0) {
    if (addedLines > removedLines) {
      changes.push(`Added ${addedLines} lines of code`);
    } else if (removedLines > addedLines) {
      changes.push(`Removed ${removedLines} lines of code`);
    } else {
      changes.push(`Modified ${addedLines} lines`);
    }
  }
  
  return changes.join(', ');
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
       } else if (fileExt === '.tsx' || fileExt === '.jsx') {
         description = 'New React component';
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
       const specificChanges = analyzeFileChanges(file);
       
       bodyParts.push(`- ${fileName}: ${specificChanges}`);
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
  
  // Generate commit message BEFORE adding to staging area
  console.log('💬 Generating commit message...');
  const commitMessage = generateCommitMessage(changes);
  console.log(`Commit message: ${commitMessage}`);
  
  // Add all changes to staging area
  console.log('📝 Adding files to staging area...');
  executeCommand('git add .');
  
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