import { getAllCommands, getAllCategories, getAllWorkflows } from '@/lib/content.js';

export default async function sitemap() {
  const baseUrl = 'https://commandatlas.dev';

  const commands = await getAllCommands();
  const categories = await getAllCategories();
  const workflows = await getAllWorkflows();

  const commandUrls = commands.map((c) => ({
    url: `${baseUrl}/command/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryUrls = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const workflowUrls = workflows.map((wf) => ({
    url: `${baseUrl}/workflow/${wf.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/workflows`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/learning`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...categoryUrls,
    ...commandUrls,
    ...workflowUrls,
  ];
}
