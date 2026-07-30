import { getAllWorkflows, getAllCategories } from '@/lib/content.js';
import WorkflowsIndexClient from './WorkflowsIndexClient.jsx';

export const metadata = {
  title: 'Workflows — CommandAtlas',
  description: 'Browse step-by-step terminal command workflows.',
};

export default async function WorkflowsPage() {
  const staticWorkflows = await getAllWorkflows();
  const staticAllCategories = await getAllCategories();

  return (
    <WorkflowsIndexClient
      staticWorkflows={staticWorkflows}
      staticAllCategories={staticAllCategories}
    />
  );
}
