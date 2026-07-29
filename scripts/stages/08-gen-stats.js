/**
 * 08-gen-stats.js — Stage 08: Generate coverage and statistics reports.
 *
 * ARCHITECTURE.md §2: "08-gen-stats → coverage/statistics reports"
 *
 * Input:  context.records (full validated set)
 * Output: context.stats — { totalCommands, totalWorkflows, totalCategories,
 *                            coverageByTopic: Map<topic, { count, slugs }> }
 *
 * The stats object is primarily used by:
 * - The orchestrator's final log line (command/workflow/category counts).
 * - Future tooling that monitors content coverage gaps.
 * - The Milestone 3 scale-up review, which needs per-topic counts to
 *   prioritize authoring effort.
 *
 * TODO (Milestone 0): implement coverage gap detection (topics in CANONICAL_TOPICS
 *   with zero commands), and a machine-readable report file in generated/.
 */

/**
 * @param {object} context
 * @param {object} _options
 */
export default async function genStats(context, _options) {
  const { records } = context;

  const commands = records.filter((r) => r.type === 'command');
  const workflows = records.filter((r) => r.type === 'workflow');
  const categories = records.filter((r) => r.type === 'category');

  const coverageByTopic = new Map();
  for (const cmd of commands) {
    const topic = cmd.frontmatter.category?.split('/')[0] ?? 'unknown';
    if (!coverageByTopic.has(topic)) {
      coverageByTopic.set(topic, { count: 0, slugs: [] });
    }
    const entry = coverageByTopic.get(topic);
    entry.count++;
    entry.slugs.push(cmd.slug);
  }

  context.stats = {
    totalCommands: commands.length,
    totalWorkflows: workflows.length,
    totalCategories: categories.length,
    coverageByTopic,
  };

  process.stdout.write(
    ` → ${commands.length} commands, ${workflows.length} workflows, ${categories.length} categories`
  );
}
