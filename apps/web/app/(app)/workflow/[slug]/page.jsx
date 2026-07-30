import { getAllWorkflows, getWorkflowBySlug, getAllCategories } from '@/lib/content.js';
import WorkflowPageClient from './WorkflowPageClient.jsx';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const workflows = await getAllWorkflows();
  return workflows.map((wf) => ({
    slug: wf.slug,
  }));
}

export async function generateMetadata({ params }) {
  const workflow = await getWorkflowBySlug(params.slug);
  if (!workflow) return { title: 'Workflow Not Found — CommandAtlas' };
  return {
    title: `${workflow.frontmatter?.title || params.slug} — CommandAtlas Workflows`,
    description:
      workflow.frontmatter?.description || `Step-by-step workflow guide for ${params.slug}`,
  };
}

export default async function WorkflowPage({ params }) {
  const staticWorkflow = await getWorkflowBySlug(params.slug);
  if (!staticWorkflow) notFound();

  const staticAllCategories = await getAllCategories();

  return (
    <WorkflowPageClient
      slug={params.slug}
      staticWorkflow={staticWorkflow}
      staticAllCategories={staticAllCategories}
    />
  );
}
