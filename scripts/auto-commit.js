#!/usr/bin/env node

// Enhanced auto-commit script with intelligent code analysis
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
          const fileContent = fs.readFileSync(filePath, 'utf8');
          if (fileContent) {
            // Add each line with + prefix to simulate git diff format
            const diffFormat = fileContent.split('\n').map(line => `+${line}`).join('\n');
            return analyzeGitDiff(diffFormat, filePath);
          }
        } catch (e) {
           // File might not exist or be readable
           console.error(`Error reading file ${filePath}:`, e instanceof Error ? e.message : String(e));
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
  
  // Check for JavaScript/Node.js specific changes
  if (fileExt === '.js' || fileExt === '.mjs' || fileExt === '.ts') {
    const jsPatterns = {
      regex: /[+-].*(?:new RegExp|\/.+\/[gimuy]*)/g,
      errorHandling: /[+-].*(?:try|catch|throw|Error|finally)/g,
      async: /[+-].*(?:async|await|Promise|then|catch)/g,
      logging: /[+-].*(?:console\.|log|debug|warn|error)/g,
      patterns: /[+-].*(?:Pattern|pattern|match|test|exec)/g,
      algorithms: /[+-].*(?:sort|filter|map|reduce|forEach|find)/g,
      validation: /[+-].*(?:validate|check|verify|test)/g,
      utilities: /[+-].*(?:util|helper|tool|format|parse)/g
    };
    
    /** @type {string[]} */
     const jsChanges = [];
     Object.entries(jsPatterns).forEach(([type, pattern]) => {
       const matches = diffOutput.match(pattern);
       if (matches && matches.length > 0) {
         jsChanges.push(`${type} (${matches.length})`);
       }
     });
     
     if (jsChanges.length > 0) {
       changes.push(`Code enhancements: ${jsChanges.slice(0, 3).join(', ')}`);
     }
    
    // Special handling for auto-commit.js or similar script files
    if (fileName.includes('commit') || fileName.includes('script')) {
      const scriptPatterns = {
        analysis: /[+-].*(?:analyze|Analysis|pattern|Pattern|detect)/g,
        gitOperations: /[+-].*(?:git|Git|commit|Commit|diff|Diff)/g,
        messageGeneration: /[+-].*(?:message|Message|generate|Generate)/g,
        fileProcessing: /[+-].*(?:file|File|process|Process|read|Read)/g
      };
      
      /** @type {string[]} */
       const scriptChanges = [];
       Object.entries(scriptPatterns).forEach(([type, pattern]) => {
         const matches = diffOutput.match(pattern);
         if (matches && matches.length > 0) {
           scriptChanges.push(`${type} logic`);
         }
       });
       
       if (scriptChanges.length > 0) {
         changes.push(`Script improvements: ${scriptChanges.slice(0, 3).join(', ')}`);
       }
    }
  }
  
  // Check for React component changes
  if (fileExt === '.tsx' || fileExt === '.jsx') {
    // Look for component definitions (both new and modified)
    const componentPattern = /(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g;
    const componentMatches = diffOutput.match(componentPattern);
    if (componentMatches) {
      const components = componentMatches.map(match => {
        const compName = match.match(/([A-Z][a-zA-Z0-9]*)/);
        return compName ? compName[1] : 'Component';
      }).filter((name, index, arr) => arr.indexOf(name) === index);
      
      if (components.length > 0) {
        const isNewFile = diffOutput.startsWith('+');
        const action = isNewFile ? 'Added' : 'Updated';
        changes.push(`${action} ${components.slice(0, 2).join(', ')} ${components.length > 2 ? `and ${components.length - 2} more components` : 'component' + (components.length > 1 ? 's' : '')}`);
      }
    }
    
    // Enhanced UI/UX pattern detection
    const uiPatterns = {
      forms: /[+-].*(?:form|Form|input|Input|field|Field|validation|Validation)/g,
      navigation: /[+-].*(?:nav|Nav|menu|Menu|route|Route|link|Link)/g,
      layout: /[+-].*(?:layout|Layout|grid|Grid|flex|Flex|container|Container)/g,
      styling: /[+-].*(?:style|Style|theme|Theme|css|Css|color|Color)/g,
      accessibility: /[+-].*(?:aria|Aria|role|Role|accessible|Accessible)/g,
      responsive: /[+-].*(?:responsive|Responsive|mobile|Mobile|tablet|Tablet)/g
    };
    
    /** @type {string[]} */
    const uiChanges = [];
    Object.entries(uiPatterns).forEach(([type, pattern]) => {
      const matches = diffOutput.match(pattern);
      if (matches && matches.length > 0) {
        uiChanges.push(`${type} enhancements`);
      }
    });
    
    if (uiChanges.length > 0) {
      changes.push(`UI/UX improvements: ${uiChanges.slice(0, 3).join(', ')}`);
    }
    
    // Enhanced business logic methods detection
    const businessLogicPatterns = {
      sorting: /(?:sort|Sort|ORDER|order)(?:By|Data|Items|List)?\s*[=:]?\s*(?:\(|=>|\{)/g,
      filtering: /(?:filter|Filter|where|Where)(?:By|Data|Items|List)?\s*[=:]?\s*(?:\(|=>|\{)/g,
      searching: /(?:search|Search|find|Find)(?:By|Data|Items|List)?\s*[=:]?\s*(?:\(|=>|\{)/g,
      pagination: /(?:page|Page|paginate|Paginate)(?:Data|Items|List)?\s*[=:]?\s*(?:\(|=>|\{)/g,
      validation: /(?:validate|Validate|check|Check)(?:Form|Data|Input)?\s*[=:]?\s*(?:\(|=>|\{)/g,
      dataProcessing: /(?:process|Process|transform|Transform|map|Map)(?:Data|Items|List)?\s*[=:]?\s*(?:\(|=>|\{)/g,
      eventHandling: /(?:handle|Handle|on[A-Z])\w*\s*[=:]?\s*(?:\(|=>|\{)/g,
      apiCalls: /(?:fetch|get|post|put|delete|api|Api)\w*\s*[=:]?\s*(?:\(|=>|\{)/g,
      calculations: /(?:calculate|Calculate|compute|Compute|sum|Sum|total|Total)\w*\s*[=:]?\s*(?:\(|=>|\{)/g,
      formatting: /(?:format|Format|parse|Parse|convert|Convert)\w*\s*[=:]?\s*(?:\(|=>|\{)/g,
      caching: /(?:cache|Cache|memo|Memo|store|Store)\w*\s*[=:]?\s*(?:\(|=>|\{)/g,
      optimization: /(?:optimize|Optimize|debounce|Debounce|throttle|Throttle)\w*\s*[=:]?\s*(?:\(|=>|\{)/g
    };
    
    /** @type {string[]} */
     const businessLogicChanges = [];
     Object.entries(businessLogicPatterns).forEach(([type, pattern]) => {
       const matches = diffOutput.match(pattern);
       if (matches) {
         const uniqueMatches = [...new Set(matches)];
         if (uniqueMatches.length > 0) {
           const methodNames = uniqueMatches.map(match => {
             const methodName = match.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1];
             return methodName || type;
           }).slice(0, 2);
           businessLogicChanges.push(`${type}: ${methodNames.join(', ')}`);
         }
       }
     });
     
     if (businessLogicChanges.length > 0) {
       changes.push(`Business logic: ${businessLogicChanges.join(', ')}`);
     }
    
    // Check for hooks usage
    const hooksPattern = /use[A-Z][a-zA-Z0-9]*/g;
    const hooksMatches = diffOutput.match(hooksPattern);
    if (hooksMatches) {
      const hooks = [...new Set(hooksMatches)].slice(0, 3);
      changes.push(`Uses React hooks: ${hooks.join(', ')}`);
    }
    
    // Enhanced state management patterns
    const statePatterns = {
      useState: /useState\s*\(/g,
      useReducer: /useReducer\s*\(/g,
      useContext: /useContext\s*\(/g,
      redux: /(?:useSelector|useDispatch|connect)\s*\(/g,
      zustand: /(?:useStore|create)\s*\(/g,
      recoil: /(?:useRecoilState|useRecoilValue|atom|selector)\s*\(/g,
      mobx: /(?:observable|action|computed)\s*\(/g,
      customHooks: /use[A-Z][a-zA-Z0-9]*\s*\(/g
    };
    
    // Detect performance optimizations
    const performancePatterns = {
      memoization: /(?:useMemo|useCallback|memo)\s*\(/g,
      lazyLoading: /(?:lazy|Suspense|dynamic)\s*\(/g,
      virtualization: /(?:virtual|Virtual|windowing|Windowing)\w*/g,
      codesplitting: /(?:import\s*\(|loadable|Loadable)\s*/g
    };
    
    /** @type {string[]} */
    const performanceChanges = [];
    Object.entries(performancePatterns).forEach(([type, pattern]) => {
      const matches = diffOutput.match(pattern);
      if (matches) {
        performanceChanges.push(`${type} (${matches.length})`);
      }
    });
    
    if (performanceChanges.length > 0) {
      changes.push(`Performance optimizations: ${performanceChanges.join(', ')}`);
    }
    
    /** @type {string[]} */
     const stateChanges = [];
     Object.entries(statePatterns).forEach(([type, pattern]) => {
       const matches = diffOutput.match(pattern);
       if (matches) {
         stateChanges.push(`${type} (${matches.length})`);
       }
     });
     
     if (stateChanges.length > 0) {
       changes.push(`State management: ${stateChanges.join(', ')}`);
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
  
  // Analyze all files to extract business context
  const allFiles = [...changes.added, ...changes.untracked, ...changes.modified];
  const businessContext = extractBusinessContext(allFiles);
  
  // Generate intelligent commit title based on business context
  let commitTitle = generateIntelligentTitle(changes, businessContext);
  
  // If no intelligent title found, fall back to basic format
  if (!commitTitle) {
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

    if (titleParts.length === 1) {
      commitTitle = titleParts[0];
    } else if (titleParts.length === 2) {
      commitTitle = titleParts.join(' and ');
    } else {
      commitTitle = `chore: update ${totalFiles} files with multiple changes`;
    }
  }

  // Generate concise but informative commit body
  const bodyParts = [];
  
  // Add business context if available
  if (businessContext.purpose) {
    bodyParts.push(`\n**Purpose:** ${businessContext.purpose}`);
  }
  
  // Add technical changes summary
  const technicalSummary = generateTechnicalSummary(changes);
  if (technicalSummary.length > 0) {
    bodyParts.push(`\n**Technical Changes:**`);
    technicalSummary.forEach(item => bodyParts.push(`• ${item}`));
  }
  
  // Add detailed file changes (more concise format)
  const fileChanges = generateFileChangesSummary(changes);
  if (fileChanges.length > 0) {
    bodyParts.push(`\n**Files Modified:**`);
    fileChanges.forEach(item => bodyParts.push(`• ${item}`));
  }
  
  // Add impact assessment
  const impact = assessChangeImpact(changes, businessContext);
  if (impact) {
    bodyParts.push(`\n**Impact:** ${impact}`);
  }
  
  // Combine title and body
  const fullMessage = commitTitle + bodyParts.join('\n');
  
  return fullMessage;
}

/**
 * Extract business context from file changes
 * @param {string[]} files - List of changed files
 * @returns {{purpose: string, domain: string, features: string[]}} Business context
 */
function extractBusinessContext(files) {
  const context = { purpose: '', domain: '', features: [] };
  
  // Analyze file types and patterns to determine business purpose
  const fileTypes = {
    components: files.filter(f => f.includes('component') || f.endsWith('.tsx') || f.endsWith('.jsx')),
    api: files.filter(f => f.includes('api') || f.includes('service') || f.includes('endpoint')),
    database: files.filter(f => f.includes('db') || f.includes('schema') || f.includes('migration')),
    config: files.filter(f => f.includes('config') || f.endsWith('.json') || f.endsWith('.env')),
    styles: files.filter(f => f.includes('style') || f.endsWith('.css') || f.endsWith('.scss')),
    tests: files.filter(f => f.includes('test') || f.includes('spec')),
    docs: files.filter(f => f.includes('readme') || f.endsWith('.md')),
    scripts: files.filter(f => f.includes('script') || f.includes('tool'))
  };
  
  // Determine primary purpose
  if (fileTypes.components.length > 0) {
    context.purpose = 'Enhance user interface and component functionality';
    context.domain = 'Frontend';
  } else if (fileTypes.api.length > 0) {
    context.purpose = 'Improve backend services and API functionality';
    context.domain = 'Backend';
  } else if (fileTypes.database.length > 0) {
    context.purpose = 'Update data models and database structure';
    context.domain = 'Database';
  } else if (fileTypes.config.length > 0) {
    context.purpose = 'Optimize project configuration and settings';
    context.domain = 'Configuration';
  } else if (fileTypes.tests.length > 0) {
    context.purpose = 'Strengthen test coverage and quality assurance';
    context.domain = 'Testing';
  } else if (fileTypes.scripts.length > 0) {
    context.purpose = 'Improve development tools and automation';
    context.domain = 'DevOps';
  }
  
  return context;
}

/**
 * Generate intelligent commit title based on business context
 * @param {{added: string[], untracked: string[], modified: string[], deleted: string[], renamed: string[]}} changes - File changes object
 * @param {{purpose: string, domain: string, features: string[]}} businessContext - Business context
 * @returns {string|null} Intelligent title or null
 */
function generateIntelligentTitle(changes, businessContext) {
  const allFiles = [...changes.added, ...changes.untracked, ...changes.modified];
  
  // Check for specific patterns
  const patterns = {
    newFeature: allFiles.some(f => f.includes('component') && changes.added.includes(f)),
    bugfix: allFiles.some(f => f.includes('fix') || f.includes('bug')),
    refactor: allFiles.some(f => changes.modified.includes(f) && !changes.added.length),
    performance: allFiles.some(f => f.includes('performance') || f.includes('optimize')),
    security: allFiles.some(f => f.includes('security') || f.includes('auth')),
    documentation: allFiles.some(f => f.endsWith('.md') || f.includes('doc')),
    configuration: allFiles.some(f => f.includes('config') || f.endsWith('.json')),
    testing: allFiles.some(f => f.includes('test') || f.includes('spec'))
  };
  
  // Generate title based on dominant pattern
  if (patterns.newFeature && businessContext.domain === 'Frontend') {
    return 'feat: add new UI components and enhance user experience';
  } else if (patterns.bugfix) {
    return 'fix: resolve issues and improve system stability';
  } else if (patterns.refactor) {
    return 'refactor: improve code structure and maintainability';
  } else if (patterns.performance) {
    return 'perf: optimize performance and resource usage';
  } else if (patterns.security) {
    return 'security: enhance security measures and authentication';
  } else if (patterns.documentation) {
    return 'docs: update documentation and project information';
  } else if (patterns.configuration) {
    return 'config: update project configuration and settings';
  } else if (patterns.testing) {
    return 'test: improve test coverage and quality assurance';
  }
  
  return null;
}

/**
 * Generate technical summary of changes
 * @param {{added: string[], untracked: string[], modified: string[], deleted: string[], renamed: string[]}} changes - File changes object
 * @returns {string[]} Technical summary items
 */
function generateTechnicalSummary(changes) {
  /** @type {string[]} */
  const summary = [];
  const allFiles = [...changes.added, ...changes.untracked, ...changes.modified];
  
  // Analyze file extensions
  /** @type {Record<string, number>} */
  const extensions = {};
  allFiles.forEach(file => {
    const ext = path.extname(file);
    extensions[ext] = (extensions[ext] || 0) + 1;
  });
  
  // Add extension-based summaries
  Object.entries(extensions).forEach(([ext, count]) => {
    switch (ext) {
      case '.tsx':
      case '.jsx':
        summary.push(`Updated ${count} React component${count > 1 ? 's' : ''}`);
        break;
      case '.ts':
      case '.js':
        summary.push(`Modified ${count} TypeScript/JavaScript file${count > 1 ? 's' : ''}`);
        break;
      case '.css':
      case '.scss':
        summary.push(`Updated ${count} stylesheet${count > 1 ? 's' : ''}`);
        break;
      case '.json':
        summary.push(`Modified ${count} configuration file${count > 1 ? 's' : ''}`);
        break;
      case '.md':
        summary.push(`Updated ${count} documentation file${count > 1 ? 's' : ''}`);
        break;
    }
  });
  
  return summary;
}

/**
 * Generate concise file changes summary
 * @param {{added: string[], untracked: string[], modified: string[], deleted: string[], renamed: string[]}} changes - File changes object
 * @returns {string[]} File changes summary
 */
function generateFileChangesSummary(changes) {
  /** @type {string[]} */
  const summary = [];
  
  // Process each change type
  [...changes.added, ...changes.untracked].forEach(file => {
    const fileName = path.basename(file);
    const analysis = analyzeFileChanges(file);
    summary.push(`${fileName} (new): ${analysis}`);
  });
  
  changes.modified.forEach(/** @param {string} file */ file => {
    const fileName = path.basename(file);
    const analysis = analyzeFileChanges(file);
    summary.push(`${fileName}: ${analysis}`);
  });
  
  changes.deleted.forEach(file => {
    const fileName = path.basename(file);
    summary.push(`${fileName}: Removed obsolete file`);
  });
  
  return summary;
}

/**
 * Assess the impact of changes
 * @param {{added: string[], untracked: string[], modified: string[], deleted: string[], renamed: string[]}} changes - File changes object
 * @param {{purpose: string, domain: string, features: string[]}} businessContext - Business context
 * @returns {string} Impact assessment
 */
function assessChangeImpact(changes, businessContext) {
  const totalFiles = Object.values(changes).flat().length;
  const hasNewFiles = changes.added.length > 0 || changes.untracked.length > 0;
  const hasModifications = changes.modified.length > 0;
  const hasDeletions = changes.deleted.length > 0;
  
  if (totalFiles === 1 && hasModifications) {
    return 'Minimal impact - single file modification';
  } else if (hasNewFiles && !hasModifications) {
    return 'Low impact - new functionality added without affecting existing code';
  } else if (hasModifications && businessContext.domain === 'Frontend') {
    return 'Medium impact - user interface changes may affect user experience';
  } else if (hasModifications && businessContext.domain === 'Backend') {
    return 'Medium impact - backend changes may affect API functionality';
  } else if (hasDeletions) {
    return 'High impact - file deletions require careful testing';
  } else if (totalFiles > 5) {
    return 'High impact - multiple files affected, comprehensive testing recommended';
  }
  
  return 'Standard impact - routine code maintenance and improvements';
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