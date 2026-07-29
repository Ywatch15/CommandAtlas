import { getAllCommands, getCommandBySlug, getAllCategories } from '@/lib/content.js';
import CommandPageClient from './CommandPageClient.jsx';

export async function generateStaticParams() {
  const commands = await getAllCommands();
  return commands.map((cmd) => ({
    slug: cmd.slug,
  }));
}

export default async function CommandPage({ params }) {
  const { slug } = params;
  const staticCommand = await getCommandBySlug(slug);
  const staticAllCategories = await getAllCategories();

  return (
    <CommandPageClient
      slug={slug}
      staticCommand={staticCommand}
      staticAllCategories={staticAllCategories}
    />
  );
}
