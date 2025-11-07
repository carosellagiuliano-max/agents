import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.schnittwerk-vanessa.ch';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/services', '/about', '/booking', '/shop', '/updates', '/privacy', '/imprint'];
  return routes.map((route) => ({
    url: new URL(route, baseUrl).toString(),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
