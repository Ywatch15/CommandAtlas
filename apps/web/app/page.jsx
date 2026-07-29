import { getAllCategories } from '@/lib/content.js';
import HomePageClient from './HomePageClient.jsx';

export default async function HomePage() {
  const staticAllCategories = await getAllCategories();
  return <HomePageClient staticAllCategories={staticAllCategories} />;
}
