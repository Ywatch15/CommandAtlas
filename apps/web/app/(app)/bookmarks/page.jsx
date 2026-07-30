import { getAllCategories } from '@/lib/content.js';
import BookmarksPageClient from './BookmarksPageClient.jsx';

export const metadata = {
  title: 'Bookmarks — CommandAtlas',
  robots: { index: false, follow: false },
};

export default async function BookmarksPage() {
  const staticAllCategories = await getAllCategories();
  return <BookmarksPageClient staticAllCategories={staticAllCategories} />;
}
