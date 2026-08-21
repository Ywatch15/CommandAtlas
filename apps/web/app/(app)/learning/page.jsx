import { getAllCategories } from '@/lib/content.js';
import LearningDiscoveryClient from './LearningDiscoveryClient.jsx';

export const metadata = {
  title: 'Learning Paths — CommandAtlas',
  description: 'Structured, step-by-step terminal learning paths with hands-on progress tracking.',
};

export default async function LearningPage() {
  const staticAllCategories = await getAllCategories();

  return <LearningDiscoveryClient staticAllCategories={staticAllCategories} />;
}
