import { useEffect } from 'react';
import type { ReactNode } from 'react';
import defaultSeoTags from '../data/seoTags';

type SeoProps = {
  title: string;
  description: string;
  url?: string;
  image?: string;
  keywords?: string;
  tags?: string[]; // additional search tags
  children?: ReactNode; // optional JSON-LD or extras
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  if (!content) return;
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function Seo({ title, description, url = '/', image = '/image.png', keywords, tags }: SeoProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    // combine provided keywords and tags with default SEO tags into a single keywords string
    const providedTags = tags && tags.length ? tags : [];
    const mergedTags = Array.from(new Set([...providedTags, ...defaultSeoTags]));
    const keywordParts = [] as string[];
    if (keywords && keywords.trim()) keywordParts.push(keywords.trim());
    if (mergedTags.length) keywordParts.push(mergedTags.join(', '));
    const keywordsStr = keywordParts.join(', ');

    upsertMeta('name', 'description', description);
    if (keywordsStr) upsertMeta('name', 'keywords', keywordsStr);
    if (keywordsStr) upsertMeta('name', 'news_keywords', keywordsStr);
    upsertMeta('name', 'author', 'WorldCup Replica');
    upsertMeta('name', 'theme-color', '#ffffff');

    // Open Graph
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    // canonical link
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // JSON-LD (simple WebPage entry)
    const ldId = 'seo-json-ld';
    let ld = document.getElementById(ldId) as HTMLScriptElement | null;
    const ldObj: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': title,
      'description': description,
      'url': url,
    };
    if (keywordsStr) ldObj['keywords'] = keywordsStr;
    if (!ld) {
      ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.id = ldId;
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(ldObj);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, url, image, keywords, tags]);

  return null;
}
