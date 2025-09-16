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
      commitTitle = titleParts[0] || null;
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
  
  // Add categorized changes summary
  const categorizedChanges = generateCategorizedChanges(changes);
  if (categorizedChanges) {
    bodyParts.push(`\n**Changes:**\n${categorizedChanges}`);
  }
  
  // Add technical changes summary
  const technicalSummary = generateTechnicalSummary(changes);
  if (technicalSummary.length > 0) {
    bodyParts.push(`\n**Technical Details:**`);
    technicalSummary.forEach(item => bodyParts.push(`• ${item}`));
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
 * @returns {{purpose: string, domain: string, features: string[], scope: string, impact: string}} Business context
 */
function extractBusinessContext(files) {
  /** @type {{purpose: string, domain: string, features: string[], scope: string, impact: string}} */
  const context = { purpose: '', domain: '', features: [], scope: '', impact: '' };
  
  // Analyze file types and patterns to determine business purpose
  const fileTypes = {
    components: files.filter(f => f.includes('component') || f.endsWith('.tsx') || f.endsWith('.jsx')),
    api: files.filter(f => f.includes('api') || f.includes('service') || f.includes('endpoint')),
    database: files.filter(f => f.includes('db') || f.includes('schema') || f.includes('migration') || f.includes('drizzle')),
    config: files.filter(f => f.includes('config') || f.endsWith('.json') || f.endsWith('.env') || f.includes('wrangler')),
    styles: files.filter(f => f.includes('style') || f.endsWith('.css') || f.endsWith('.scss')),
    tests: files.filter(f => f.includes('test') || f.includes('spec')),
    docs: files.filter(f => f.includes('readme') || f.endsWith('.md')),
    scripts: files.filter(f => f.includes('script') || f.includes('tool') || f.includes('auto-commit')),
    utils: files.filter(f => f.includes('util') || f.includes('helper') || f.includes('lib')),
    auth: files.filter(f => f.includes('auth') || f.includes('login') || f.includes('user')),
    ui: files.filter(f => f.includes('ui/') || f.includes('button') || f.includes('form') || f.includes('card'))
  };
  
  // Determine scope and impact
  const totalFiles = files.length;
  if (totalFiles === 1) {
    context.scope = 'focused';
  } else if (totalFiles <= 3) {
    context.scope = 'targeted';
  } else if (totalFiles <= 6) {
    context.scope = 'moderate';
  } else {
    context.scope = 'comprehensive';
  }
  
  // Determine primary purpose with more nuanced analysis
  const priorities = [];
  
  if (fileTypes.components.length > 0 || fileTypes.ui.length > 0) {
    priorities.push({ type: 'Frontend', purpose: 'Enhance user interface and component functionality', weight: fileTypes.components.length + fileTypes.ui.length });
  }
  
  if (fileTypes.api.length > 0) {
    priorities.push({ type: 'Backend', purpose: 'Improve backend services and API functionality', weight: fileTypes.api.length });
  }
  
  if (fileTypes.database.length > 0) {
    priorities.push({ type: 'Database', purpose: 'Update data models and database structure', weight: fileTypes.database.length });
  }
  
  if (fileTypes.auth.length > 0) {
    priorities.push({ type: 'Authentication', purpose: 'Enhance authentication and user management', weight: fileTypes.auth.length });
  }
  
  if (fileTypes.config.length > 0) {
    priorities.push({ type: 'Configuration', purpose: 'Optimize project configuration and deployment settings', weight: fileTypes.config.length });
  }
  
  if (fileTypes.scripts.length > 0) {
    priorities.push({ type: 'DevOps', purpose: 'Improve development tools and automation workflows', weight: fileTypes.scripts.length });
  }
  
  if (fileTypes.tests.length > 0) {
    priorities.push({ type: 'Testing', purpose: 'Strengthen test coverage and quality assurance', weight: fileTypes.tests.length });
  }
  
  if (fileTypes.docs.length > 0) {
    priorities.push({ type: 'Documentation', purpose: 'Update project documentation and guides', weight: fileTypes.docs.length });
  }
  
  if (fileTypes.utils.length > 0) {
    priorities.push({ type: 'Utilities', purpose: 'Enhance utility functions and shared libraries', weight: fileTypes.utils.length });
  }
  
  // Select the highest priority purpose
  if (priorities.length > 0) {
    const sortedPriorities = priorities.sort((a, b) => b.weight - a.weight);
    const topPriority = sortedPriorities[0];
    if (topPriority) {
      context.domain = topPriority.type;
      context.purpose = topPriority.purpose;
      
      // Add secondary purposes if significant
      const secondaryPurposes = sortedPriorities.filter(p => p !== topPriority && p.weight >= 2);
      if (secondaryPurposes.length > 0) {
        context.features = secondaryPurposes.map(p => p.type.toLowerCase());
      }
    }
  } else {
    context.purpose = 'General code improvements and maintenance';
    context.domain = 'General';
  }
  
  // Determine impact level
  if (fileTypes.database.length > 0 || fileTypes.api.length > 2) {
    context.impact = 'high';
  } else if (fileTypes.components.length > 2 || fileTypes.config.length > 1) {
    context.impact = 'medium';
  } else {
    context.impact = 'low';
  }
  
  return context;
}

/**
 * Generate intelligent commit title based on business context
 * @param {{added: string[], untracked: string[], modified: string[], deleted: string[], renamed: string[]}} changes - File changes object
 * @param {{purpose: string, domain: string, features: string[], scope: string, impact: string}} businessContext - Business context
 * @returns {string|null} Intelligent title or null
 */
function generateIntelligentTitle(changes, businessContext) {
  const allFiles = [...changes.added, ...changes.untracked, ...changes.modified];
  const { domain, purpose, features, scope, impact } = businessContext;
  
  // Create a conceptual summary based on the business context
  const createConceptualSummary = () => {
    if (features.length > 0) {
      return features.slice(0, 2).join(' and ');
    }
    
    // Extract key concepts from purpose
    const purposeWords = purpose.toLowerCase().split(' ');
    const keyWords = purposeWords.filter(word => 
      !['and', 'or', 'the', 'a', 'an', 'to', 'for', 'in', 'on', 'at', 'by', 'with'].includes(word)
    ).slice(0, 3);
    
    return keyWords.join(' ');
  };
  
  const conceptSummary = createConceptualSummary();
  const scopePrefix = scope ? `${scope}` : domain.toLowerCase();
  
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
  
  // Pattern-based title generation with conceptual summaries
  if (patterns.newFeature) {
    if (domain === 'Frontend' || domain === 'UI') {
      return `feat(${scopePrefix}): add ${conceptSummary} functionality`;
    } else if (domain === 'Backend' || domain === 'API') {
      return `feat(${scopePrefix}): implement ${conceptSummary} services`;
    } else if (domain === 'Database') {
      return `feat(${scopePrefix}): add ${conceptSummary} data layer`;
    }
    return `feat: add ${conceptSummary} feature`;
  } else if (patterns.bugfix) {
    return `fix(${scopePrefix}): resolve ${conceptSummary} issues`;
  } else if (patterns.refactor) {
    if (impact === 'high') {
      return `refactor(${scopePrefix}): restructure ${conceptSummary} architecture`;
    }
    return `refactor(${scopePrefix}): improve ${conceptSummary} implementation`;
  } else if (patterns.performance) {
    return `perf(${scopePrefix}): optimize ${conceptSummary} performance`;
  } else if (patterns.security) {
    return `security(${scopePrefix}): enhance ${conceptSummary} security`;
  } else if (patterns.documentation) {
    return `docs(${scopePrefix}): update ${conceptSummary} documentation`;
  } else if (patterns.configuration) {
    if (conceptSummary.includes('config') || conceptSummary.includes('setup')) {
      return `chore(config): update ${conceptSummary}`;
    }
    return `chore(deps): update ${conceptSummary} dependencies`;
  } else if (patterns.testing) {
    return `test(${scopePrefix}): add ${conceptSummary} test coverage`;
  }
  
  // Fallback with intelligent categorization
  if (purpose.includes('improve') || purpose.includes('enhance')) {
    return `improve(${scopePrefix}): ${conceptSummary}`;
  } else if (purpose.includes('update') || purpose.includes('modify')) {
    return `update(${scopePrefix}): ${conceptSummary}`;
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
 * Generate categorized changes summary
 * @param {{added: string[], untracked: string[], modified: string[], deleted: string[], renamed: string[]}} changes - File changes object
 * @returns {string} Categorized changes summary
 */
function generateCategorizedChanges(changes) {
  /** @type {string[]} */
  const newFeatures = [];
  /** @type {string[]} */
  const optimizations = [];
  /** @type {string[]} */
  const bugFixes = [];
  /** @type {string[]} */
  const configurations = [];

  // Analyze each modified file
  changes.modified.forEach(/** @param {string} file */ (file) => {
    const analysis = analyzeFileChanges(file);
    const fileName = path.basename(file);
    const fileExt = path.extname(file);
    
    // Categorize based on analysis content and file type
    if (analysis.includes('Added') || analysis.includes('新增') || analysis.includes('component') || analysis.includes('function')) {
      const feature = extractFeatureDescription(analysis, file);
      if (feature) {
        newFeatures.push(feature);
      } else {
        newFeatures.push(`new functionality in ${fileName}`);
      }
    }
    
    if (analysis.includes('optimization') || analysis.includes('performance') || analysis.includes('memoization') || analysis.includes('refactor')) {
      const optimization = extractOptimizationDescription(analysis, file);
      if (optimization) {
        optimizations.push(optimization);
      } else {
        optimizations.push(`performance improvements in ${fileName}`);
      }
    }
    
    if (analysis.includes('fix') || analysis.includes('修复') || analysis.includes('error') || analysis.includes('bug')) {
      const fix = extractFixDescription(analysis, file);
      if (fix) {
        bugFixes.push(fix);
      } else {
        bugFixes.push(`error handling in ${fileName}`);
      }
    }
    
    // Handle configuration files
    if (fileExt === '.json' || fileExt === '.config.js' || fileExt === '.ts' && fileName.includes('config')) {
      configurations.push(`${fileName} settings`);
    }
    
    // Default categorization for other changes
    if (!analysis.includes('Added') && !analysis.includes('optimization') && !analysis.includes('fix') && !configurations.some(config => config.includes(fileName))) {
      const general = extractGeneralDescription(analysis, file);
      if (general) {
        optimizations.push(general);
      } else {
        optimizations.push(`code structure in ${fileName}`);
      }
    }
  });

  // Analyze added files with better categorization
  changes.added.forEach(/** @param {string} file */ (file) => {
    const fileName = path.basename(file);
    const fileExt = path.extname(file);
    
    if (fileExt === '.tsx' || fileExt === '.jsx') {
      newFeatures.push(`${fileName} component`);
    } else if (fileExt === '.ts' || fileExt === '.js') {
      if (fileName.includes('util') || fileName.includes('helper')) {
        newFeatures.push(`${fileName} utility module`);
      } else if (fileName.includes('config')) {
        configurations.push(`${fileName} configuration`);
      } else {
        newFeatures.push(`${fileName} module`);
      }
    } else if (fileExt === '.md') {
      configurations.push(`${fileName} documentation`);
    } else {
      newFeatures.push(`${fileName} file`);
    }
  });

  // Analyze untracked files
  changes.untracked.forEach(/** @param {string} file */ (file) => {
    const fileName = path.basename(file);
    newFeatures.push(`${fileName} file`);
  });

  // Analyze deleted files
  changes.deleted.forEach(/** @param {string} file */ (file) => {
    const fileName = path.basename(file);
    optimizations.push(`removed ${fileName}`);
  });

  // Format the categorized summary with better English descriptions
  /** @type {string[]} */
  const summary = [];
  
  if (newFeatures.length > 0) {
    const featureList = newFeatures.slice(0, 3).join(', ') + (newFeatures.length > 3 ? ` and ${newFeatures.length - 3} more` : '');
    summary.push(`1. New Features: Added ${featureList}`);
  }
  
  if (optimizations.length > 0) {
    const optimizationList = optimizations.slice(0, 3).join(', ') + (optimizations.length > 3 ? ` and ${optimizations.length - 3} more` : '');
    summary.push(`2. Improvements: Enhanced ${optimizationList}`);
  }
  
  if (bugFixes.length > 0) {
    const fixList = bugFixes.slice(0, 3).join(', ') + (bugFixes.length > 3 ? ` and ${bugFixes.length - 3} more` : '');
    summary.push(`3. Bug Fixes: Resolved ${fixList}`);
  }
  
  if (configurations.length > 0) {
    const configList = configurations.slice(0, 3).join(', ') + (configurations.length > 3 ? ` and ${configurations.length - 3} more` : '');
    summary.push(`4. Configuration: Updated ${configList}`);
  }

  return summary.join('\n');
}

/**
 * Extract feature description from analysis
 * @param {string} analysis - File analysis result
 * @param {string} file - File path
 * @returns {string} Feature description
 */
function extractFeatureDescription(analysis, file) {
  const fileName = path.basename(file).replace(/\.(tsx?|jsx?)$/, '') || 'component';
  
  if (analysis.includes('forms')) return 'form handling logic';
  if (analysis.includes('navigation')) return 'navigation functionality';
  if (analysis.includes('authentication')) return 'user authentication system';
  if (analysis.includes('API') || analysis.includes('api')) return 'API integration';
  if (analysis.includes('database')) return 'database operations';
  if (analysis.includes('component')) return `${fileName} component logic`;
  if (analysis.includes('hook')) return `${fileName} custom hook`;
  if (analysis.includes('util')) return `${fileName} utility functions`;
  
  return `${fileName} functionality`;
}

/**
 * Extract optimization description from analysis
 * @param {string} analysis - File analysis result
 * @param {string} file - File path
 * @returns {string} Optimization description
 */
function extractOptimizationDescription(analysis, file) {
  const fileName = path.basename(file).replace(/\.(tsx?|jsx?)$/, '') || 'component';
  
  if (analysis.includes('memoization')) return 'component memoization';
  if (analysis.includes('performance')) return 'performance optimizations';
  if (analysis.includes('lazy')) return 'lazy loading implementation';
  if (analysis.includes('debounce')) return 'debounce handling';
  if (analysis.includes('throttle')) return 'throttle implementation';
  if (analysis.includes('state')) return 'state management';
  if (analysis.includes('refactor')) return `${fileName} code structure`;
  if (analysis.includes('algorithm')) return 'algorithm efficiency';
  
  return `${fileName} implementation`;
}

/**
 * Extract fix description from analysis
 * @param {string} analysis - File analysis result
 * @param {string} file - File path
 * @returns {string} Fix description
 */
function extractFixDescription(analysis, file) {
  const fileName = path.basename(file).replace(/\.(tsx?|jsx?)$/, '') || 'component';
  
  if (analysis.includes('type')) return 'type safety issues';
  if (analysis.includes('validation')) return 'data validation logic';
  if (analysis.includes('error')) return 'error handling mechanisms';
  if (analysis.includes('bug')) return 'functional defects';
  if (analysis.includes('memory')) return 'memory leak issues';
  if (analysis.includes('security')) return 'security vulnerabilities';
  
  return `${fileName} issues`;
}

/**
 * Extract general description from analysis
 * @param {string} analysis - File analysis result
 * @param {string} file - File path
 * @returns {string} General description
 */
function extractGeneralDescription(analysis, file) {
  const fileName = path.basename(file).replace(/\.(tsx?|jsx?)$/, '') || 'component';
  
  if (analysis.includes('styling')) return 'styling adjustments';
  if (analysis.includes('layout')) return 'layout improvements';
  if (analysis.includes('config')) return 'configuration updates';
  if (analysis.includes('import')) return 'dependency management';
  if (analysis.includes('documentation')) return 'code documentation';
  if (analysis.includes('cleanup')) return 'code cleanup';
  
  return `${fileName} structure`;
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