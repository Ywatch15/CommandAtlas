import { getAllCommands, getAllCategories } from '@/lib/content.js';
import ComparePageClient from './ComparePageClient.jsx';

export const metadata = {
  title: 'Compare Commands — CommandAtlas',
};

export default async function ComparePage() {
  const staticAllCommands = await getAllCommands();
  const staticAllCategories = await getAllCategories();
  return (
    <ComparePageClient
      staticAllCommands={staticAllCommands}
      staticAllCategories={staticAllCategories}
    />
  );
}
