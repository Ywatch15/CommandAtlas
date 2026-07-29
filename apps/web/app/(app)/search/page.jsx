import { getAllCategories } from '@/lib/content.js';
import SearchPageClient from './SearchPageClient.jsx';

export const metadata = {
  title: 'Search Commands — CommandAtlas',
  robots: {
    index: false,
    follow: true,
  },
};

export default async function SearchPage() {
  const staticAllCategories = await getAllCategories();
  return <SearchPageClient staticAllCategories={staticAllCategories} />;
}
