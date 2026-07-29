import { getAllCategories, getCategoryBySlug, getAllCommands } from '@/lib/content.js';
import CategoryPageClient from './CategoryPageClient.jsx';

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({
    slug: cat.slug,
  }));
}

export default async function CategoryPage({ params }) {
  const { slug } = params;
  const staticCategory = await getCategoryBySlug(slug);
  const allCommands = await getAllCommands();
  const staticCommands = allCommands.filter(
    (cmd) => (cmd.category || cmd.frontmatter?.category || '').split('/')[0] === slug
  );
  const staticAllCategories = await getAllCategories();

  return (
    <CategoryPageClient
      slug={slug}
      staticCategory={staticCategory}
      staticCommands={staticCommands}
      staticAllCategories={staticAllCategories}
    />
  );
}
