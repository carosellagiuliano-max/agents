import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.schnittwerk-vanessa.ch';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/services', '/about', '/booking', '/shop', '/updates'],
      disallow: ['/api/', '/admin'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
