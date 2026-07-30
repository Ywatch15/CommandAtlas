import fs from 'fs/promises';
import path from 'path';

export default async function genPacks(context, _options) {
  const packsDir = path.join(context.generatedDir, 'packs');
  await fs.mkdir(path.join(packsDir, 'commands'), { recursive: true });
  await fs.mkdir(path.join(packsDir, 'workflows'), { recursive: true });

  const packMap = new Map();

  const getOrCreatePack = (packId) => {
    if (!packMap.has(packId)) {
      packMap.set(packId, {
        packId,
        commands: [],
        workflows: [],
        categories: [],
      });
    }
    return packMap.get(packId);
  };

  // Build reverse "usedInWorkflows" lookup map
  const commandToWorkflowsMap = new Map();
  for (const record of context.records) {
    if (record.type === 'workflow' && record.frontmatter?.steps) {
      for (const step of record.frontmatter.steps) {
        if (step.command) {
          if (!commandToWorkflowsMap.has(step.command)) {
            commandToWorkflowsMap.set(step.command, []);
          }
          commandToWorkflowsMap.get(step.command).push({
            slug: record.slug,
            title: record.frontmatter.title,
            category: record.frontmatter.category,
          });
        }
      }
    }
  }

  for (const record of context.records) {
    if (record.type === 'command') {
      const topLevel = record.frontmatter.category?.split('/')[0] ?? 'unknown';
      const pack = getOrCreatePack(topLevel);
      const usedInWorkflows = commandToWorkflowsMap.get(record.slug) || [];
      pack.commands.push({
        slug: record.slug,
        name: record.frontmatter.name,
        category: record.frontmatter.category,
        contentVersion: record.contentVersion,
        frontmatter: {
          ...record.frontmatter,
          usedInWorkflows,
        },
        body: record.body,
      });
    } else if (record.type === 'workflow') {
      const topLevel = record.frontmatter.category?.split('/')[0] ?? 'unknown';
      const pack = getOrCreatePack(topLevel);
      pack.workflows.push({
        slug: record.slug,
        title: record.frontmatter.title,
        category: record.frontmatter.category,
        contentVersion: record.contentVersion,
        frontmatter: record.frontmatter,
        body: record.body,
      });
    } else if (record.type === 'category') {
      const topLevel = record.frontmatter.parent || record.slug;
      const pack = getOrCreatePack(topLevel);
      pack.categories.push({
        slug: record.slug,
        name: record.frontmatter.name,
        description: record.frontmatter.description,
        parent: record.frontmatter.parent,
        status: record.frontmatter.status,
        frontmatter: record.frontmatter,
        body: record.body,
      });
    }
  }

  for (const [packId, packData] of packMap) {
    const outPath = path.join(packsDir, 'commands', `${packId}.json`);
    await fs.writeFile(outPath, JSON.stringify(packData, null, 2), 'utf-8');

    if (packData.workflows.length > 0) {
      const wfPath = path.join(packsDir, 'workflows', `${packId}.json`);
      await fs.writeFile(
        wfPath,
        JSON.stringify({ packId, workflows: packData.workflows }, null, 2),
        'utf-8'
      );
    }
  }

  context.packs = packMap;
  process.stdout.write(` → ${packMap.size} pack(s) written`);
}
