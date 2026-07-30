import { getAllCategories } from '@/lib/content.js';
import LearnPathClient from './LearnPathClient.jsx';
import { notFound } from 'next/navigation';

const STATIC_PATHS = {
  'linux-fundamentals': {
    slug: 'linux-fundamentals',
    title: 'Linux Fundamentals for DevOps',
    description:
      'Master essential Linux terminal navigation, file permissions, and process management.',
    steps: [
      {
        title: 'File System Navigation',
        description: 'Learn cd, ls, pwd, and directory hierarchy.',
        commandSlug: 'ls',
      },
      {
        title: 'Text Searching with Grep',
        description: 'Master pattern matching across server logs.',
        commandSlug: 'grep',
      },
      {
        title: 'File Permissions & Ownership',
        description: 'Understand chmod, chown, and octal security masks.',
        commandSlug: 'chmod',
      },
    ],
  },
};

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
