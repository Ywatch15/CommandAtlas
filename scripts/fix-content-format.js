import fs from 'fs';
import path from 'path';

function getMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getMdFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const commandsDir = path.join(process.cwd(), 'content', 'commands');
const mdFiles = getMdFiles(commandsDir);

let fixedFilesCount = 0;

for (const file of mdFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const originalLines = content.split(/\r?\n/);
  const newLines = [];

  let currentSection = '';

  for (let line of originalLines) {
    if (line.startsWith('## ')) {
      currentSection = line.trim();
      newLines.push(line);
      continue;
    }

    if (currentSection === '## Interview Questions') {
      // Replace bullet / italic / bold variations of Query / Q
      line = line.replace(
        /^[\s]*-\s*(?:_\s*Query:?\s*_|\*\*\s*Query:?\s*\*\*|\*\*\s*Q:?\s*\*\*|_\s*Q:?\s*_)\s*/,
        '**Q:** '
      );
      line = line.replace(/^[\s]*-\s*(?:_\s*A:?\s*_|\*\*\s*A:?\s*\*\*)\s*/, '**A:** ');
      line = line.replace(/^Query:\s*/, '**Q:** ');
      line = line.replace(/^_Query:_\s*/, '**Q:** ');
    } else if (currentSection === '## Practice Problems') {
      line = line.replace(
        /^[\s]*-\s*(?:_\s*Problem:?\s*_|\*\*\s*Problem:?\s*\*\*)\s*/,
        '**Problem:** '
      );
      line = line.replace(/^[\s]*-\s*(?:_\s*Hint:?\s*_|\*\*\s*Hint:?\s*\*\*)\s*/, '**Hint:** ');
      line = line.replace(
        /^[\s]*-\s*(?:_\s*Solution:?\s*_|\*\*\s*Solution:?\s*\*\*)\s*/,
        '**Solution:** '
      );
    } else if (currentSection === '## References') {
      line = line.replace(/^-\s+-\s+\[/, '- [');
    }

    newLines.push(line);
  }

  const newContent = newLines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    fixedFilesCount++;
  }
}

console.log(`Content formatting script complete.`);
console.log(`Total files formatted: ${fixedFilesCount}`);
