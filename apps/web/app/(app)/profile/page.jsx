import { getAllCategories } from '@/lib/content.js';
import ProfilePageClient from './ProfilePageClient.jsx';

export const metadata = {
  title: 'Profile & Sync — CommandAtlas',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const staticAllCategories = await getAllCategories();
  return <ProfilePageClient staticAllCategories={staticAllCategories} />;
}
