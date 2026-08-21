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

let queryCount = 0;
let bulletNestedCount = 0;
const affectedFiles = new Set();
const details = [];

for (const file of mdFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let fileHasViolation = false;

  const interviewSection = content.split(/## Interview Questions/i)[1]?.split(/^## /m)[0] || '';
  const practiceSection = content.split(/## Practice Problems/i)[1]?.split(/^## /m)[0] || '';

  // Check for Query: or _Query:_ in IQ or PP sections
  if (
    /\bQuery:/i.test(interviewSection) ||
    /_Query:_/i.test(interviewSection) ||
    /\bQuery:/i.test(practiceSection) ||
    /_Query:_/i.test(practiceSection)
  ) {
    fileHasViolation = true;
    queryCount++;
  }

  // Check for bullet nesting in IQ or PP sections
  const hasBulletIQ =
    /^[\s]*-\s*(?:\*\*(?:Q|A|Query):?\*\*|_Query:_|\*\*Problem:\*\*|\*\*Hint:\*\*|\*\*Solution:\*\*)/m.test(
      interviewSection
    );
  const hasBulletPP = /^[\s]*-\s*(?:\*\*(?:Problem|Hint|Solution|Q|A):?\*\*|_Query:_)/m.test(
    practiceSection
  );

  if (hasBulletIQ || hasBulletPP) {
    fileHasViolation = true;
    bulletNestedCount++;
  }

  if (fileHasViolation) {
    affectedFiles.add(file);
    details.push(path.relative(process.cwd(), file));
  }
}

console.log(`Total MD files checked: ${mdFiles.length}`);
console.log(`Files with format violations in IQ/PP: ${affectedFiles.size}`);
console.log(`Files with 'Query:' violation in IQ/PP: ${queryCount}`);
console.log(`Files with bullet/nested list violation in IQ/PP: ${bulletNestedCount}`);
