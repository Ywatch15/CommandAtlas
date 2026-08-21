import { getAllCategories } from '@/lib/content.js';
import LearnPathClient from './LearnPathClient.jsx';
import { notFound } from 'next/navigation';
import { STATIC_PATHS } from '@/lib/learningPathsData.js';

export async function generateStaticParams() {
  return Object.keys(STATIC_PATHS).map((slug) => ({
    pathSlug: slug,
  }));
}

export async function generateMetadata({ params }) {
  const pathData = STATIC_PATHS[params.pathSlug];
  if (!pathData) return { title: 'Learning Path Not Found — CommandAtlas' };
  return {
    title: `${pathData.title} — CommandAtlas Learning`,
    description: pathData.description,
  };
}

export default async function LearnPathPage({ params }) {
  const pathData = STATIC_PATHS[params.pathSlug];
  if (!pathData) notFound();

  const staticAllCategories = await getAllCategories();

  return (
    <LearnPathClient
      pathSlug={params.pathSlug}
      pathData={pathData}
      staticAllCategories={staticAllCategories}
    />
  );
}
