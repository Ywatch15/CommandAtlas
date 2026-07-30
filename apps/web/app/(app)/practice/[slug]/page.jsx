import { getAllCommands, getAllCategories } from '@/lib/content.js';
import PracticeClient from './PracticeClient.jsx';

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
    title: `Practice Problems (${slug}) — CommandAtlas`,
  };
}

export default async function PracticePage({ params }) {
  const staticAllCommands = await getAllCommands();
  const staticAllCategories = await getAllCategories();
  return (
    <PracticeClient
      currentSlug={params.slug}
      staticAllCommands={staticAllCommands}
      staticAllCategories={staticAllCategories}
    />
  );
}
