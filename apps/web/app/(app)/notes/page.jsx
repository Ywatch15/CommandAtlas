import { getAllCategories } from '@/lib/content.js';
import NotesPageClient from './NotesPageClient.jsx';

export const metadata = {
  title: 'My Notes — CommandAtlas',
  robots: { index: false, follow: false },
};

export default async function NotesPage() {
  const staticAllCategories = await getAllCategories();
  return <NotesPageClient staticAllCategories={staticAllCategories} />;
}
