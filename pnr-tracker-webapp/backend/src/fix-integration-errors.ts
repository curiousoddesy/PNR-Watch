#!/usr/bin/env tsx

/**
 * Script to fix integration TypeScript errors
 */

import fs from 'fs';
import path from 'path';

const fixes = [
  {
    file: 'src/models/Notification.ts',
    replacements: [
      {
        search: /query \+= ` AND is_read = \$\{paramCount\}`;/g,
        replace: 'query += ` AND is_read = $${paramCount}`;'
      },
      {
        search: /query \+= ` AND created_at >= \$\{paramCount\}`;/g,
        replace: 'query += ` AND created_at >= $${paramCount}`;'
      },
      {
        search: /query \+= ` AND created_at <= \$\{paramCount\}`;/g,
        replace: 'query += ` AND created_at <= $${paramCount}`;'
      },
      {
        search: /query \+= ` LIMIT \$\{paramCount\}`;/g,
        replace: 'query += ` LIMIT $${paramCount}`;'
      },
      {
        search: /query \+= ` OFFSET \$\{paramCount\}`;/g,
        replace: 'query += ` OFFSET $${paramCount}`;'
      }
    ]
  }
];

async function applyFixes() {
  console.log('Applying TypeScript fixes...');
  
  for (const fix of fixes) {
    const filePath = path.join(__dirname, '..', fix.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${fix.file} - file not found`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const replacement of fix.replacements) {
      if (content.match(replacement.search)) {
        content = content.replace(replacement.search, replacement.replace);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed ${fix.file}`);
    }
  }
  
  console.log('Fixes applied successfully!');
}

if (require.main === module) {
  applyFixes().catch(console.error);
}