import { getAllCommands, getAllCategories } from '@/lib/content.js';
import InterviewPrepClient from './InterviewPrepClient.jsx';

export async function generateStaticParams() {
  const categories = await getAllCategories();
  const params = [{ slug: 'all' }];
  for (const cat of categories) {
    params.push({ slug: cat.slug });
  }
  return params;
}

export async function generateMetadata({ params }) {
  const slug = params.slug;
  return {
    title: `Interview Prep (${slug}) — CommandAtlas`,
  };
}

export default async function InterviewPrepPage({ params }) {
  const staticAllCommands = await getAllCommands();
  const staticAllCategories = await getAllCategories();
  return (
    <InterviewPrepClient
      currentSlug={params.slug}
      staticAllCommands={staticAllCommands}
      staticAllCategories={staticAllCategories}
    />
  );
}
