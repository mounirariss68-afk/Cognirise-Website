import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { ALLIANCE_PLATFORM_LIST } from './src/lib/alliancePlatforms';
import { launchHrefAllowed } from '../../lib/api-zod/src/launch-policy';

const siteOrigin = 'https://cognirise.ai';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceHeadValue(html: string, pattern: RegExp, replacement: string, label: string) {
  if (!pattern.test(html)) {
    throw new Error(`Could not find ${label} in the built HTML shell.`);
  }
  return html.replace(pattern, replacement);
}

function renderAllianceBody(platform: (typeof ALLIANCE_PLATFORM_LIST)[number]) {
  const facts = platform.facts
    .map(
      (fact) => `
          <li>
            <strong>${escapeHtml(fact.value)}</strong>
            <span>${escapeHtml(fact.label)}</span>
          </li>`,
    )
    .join('');
  const workflow = platform.workflow
    .map(
      (step) => `
          <li>
            <span>${escapeHtml(step.label)}</span>
            <h2>${escapeHtml(step.title)}</h2>
            <p>${escapeHtml(step.description)}</p>
          </li>`,
    )
    .join('');
  const differentiators = platform.differentiators
    .map(
      (item) => `
          <li>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.description)}</p>
          </li>`,
    )
    .join('');
  const sources = platform.sources
    .map(
      (source) => `
          <li>
            <a href="${escapeHtml(source.url)}">${escapeHtml(source.label)}</a>
            <p>${escapeHtml(source.supports)}</p>
          </li>`,
    )
    .join('');

  return `
      <main data-prerendered-alliance="${platform.slug}">
        <article>
          <header>
            <p>${escapeHtml(platform.eyebrow)}</p>
            <p>${escapeHtml(platform.name)}</p>
            <h1>${escapeHtml(platform.headline)}</h1>
            <p>${escapeHtml(platform.summary)}</p>
            <img src="${escapeHtml(platform.heroImage)}" alt="${escapeHtml(platform.heroAlt)}" />
          </header>
          <section aria-labelledby="${platform.slug}-problem">
            <h2 id="${platform.slug}-problem">The operating problem</h2>
            <p>${escapeHtml(platform.problem)}</p>
          </section>
          <section aria-labelledby="${platform.slug}-mechanism">
            <h2 id="${platform.slug}-mechanism">How the platform works</h2>
            <p>${escapeHtml(platform.mechanism)}</p>
            <ul>${facts}
            </ul>
          </section>
          <section aria-labelledby="${platform.slug}-workflow">
            <h2 id="${platform.slug}-workflow">From source to operation</h2>
            <ol>${workflow}
            </ol>
          </section>
          <section aria-labelledby="${platform.slug}-difference">
            <h2 id="${platform.slug}-difference">What makes the platform useful</h2>
            <ul>${differentiators}
            </ul>
          </section>
          <section aria-labelledby="${platform.slug}-alliance">
            <h2 id="${platform.slug}-alliance">Where Cognirise contributes</h2>
            <p>${escapeHtml(platform.contribution)}</p>
          </section>
          <section aria-labelledby="${platform.slug}-evidence">
            <h2 id="${platform.slug}-evidence">Evidence</h2>
            <ul>${sources}
            </ul>
            <p>Product facts verified ${escapeHtml(platform.verifiedOn)}.</p>
          </section>
        </article>
      </main>`;
}

function renderAllianceHtml(shell: string, platform: (typeof ALLIANCE_PLATFORM_LIST)[number]) {
  const route = `/platforms/${platform.slug}`;
  const canonical = `${siteOrigin}${route}`;
  const image = `${siteOrigin}${platform.meta.socialImage}`;
  let html = shell;
  html = replaceHeadValue(html, /<title>.*?<\/title>/, `<title>${escapeHtml(platform.meta.title)}</title>`, 'title');
  html = replaceHeadValue(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(platform.meta.description)}" />`, 'description');
  html = replaceHeadValue(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(platform.meta.title)}" />`, 'Open Graph title');
  html = replaceHeadValue(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(platform.meta.description)}" />`, 'Open Graph description');
  html = replaceHeadValue(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonical}" />`, 'Open Graph URL');
  html = replaceHeadValue(html, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${image}" />`, 'Open Graph image');
  html = replaceHeadValue(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(platform.meta.title)}" />`, 'Twitter title');
  html = replaceHeadValue(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(platform.meta.description)}" />`, 'Twitter description');
  html = replaceHeadValue(html, /<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${image}" />`, 'Twitter image');
  html = replaceHeadValue(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonical}" />`, 'canonical URL');
  return replaceHeadValue(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${renderAllianceBody(platform)}</div>`,
    'application root',
  );
}

function assertAllianceHtml(html: string, platform: (typeof ALLIANCE_PLATFORM_LIST)[number]) {
  const route = `/platforms/${platform.slug}`;
  const expected = [
    platform.meta.title,
    platform.meta.description,
    `${siteOrigin}${route}`,
    `${siteOrigin}${platform.meta.socialImage}`,
    `data-prerendered-alliance="${platform.slug}"`,
    `<h1>${escapeHtml(platform.headline)}</h1>`,
    escapeHtml(platform.summary),
    escapeHtml(platform.problem),
    escapeHtml(platform.mechanism),
    escapeHtml(platform.contribution),
    ...platform.sources.map((source) => escapeHtml(source.url)),
  ];
  const missing = expected.filter((value) => !html.includes(value));
  if (missing.length > 0) {
    throw new Error(`Generated HTML check failed for ${route}: missing ${missing.join(', ')}`);
  }
}

function alliancePrerenderPlugin(): Plugin {
  return {
    name: 'cognirise-alliance-prerender',
    apply: 'build',
    async closeBundle() {
      const outputRoot = path.resolve(import.meta.dirname, 'dist/public');
      const shell = await readFile(path.join(outputRoot, 'index.html'), 'utf8');
      const sitemapPath = path.join(outputRoot, 'sitemap.xml');
      await writeFile(sitemapPath, filterLaunchSitemap(await readFile(sitemapPath, 'utf8')));

      for (const platform of ALLIANCE_PLATFORM_LIST) {
        if (!launchHrefAllowed(`/platforms/${platform.slug}`)) continue;
        const route = `/platforms/${platform.slug}`;
        const html = renderAllianceHtml(shell, platform);
        const routeDirectory = path.join(outputRoot, route.slice(1));
        const outputFile = path.join(routeDirectory, 'index.html');
        await mkdir(routeDirectory, { recursive: true });
        await writeFile(outputFile, html);
        assertAllianceHtml(await readFile(outputFile, 'utf8'), platform);
      }
    },
  };
}

function filterLaunchSitemap(xml: string) {
  return xml.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const href = entry.match(/<loc>(.*?)<\/loc>/)?.[1];
    return href && launchHrefAllowed(href) ? entry : '';
  });
}

function launchSitemapPlugin(): Plugin {
  return {
    name: 'cognirise-launch-sitemap',
    configureServer(server) {
      server.middlewares.use('/sitemap.xml', async (_req, res, next) => {
        try {
          const xml = await readFile(path.resolve(import.meta.dirname, 'public/sitemap.xml'), 'utf8');
          res.setHeader('Content-Type', 'application/xml');
          res.end(filterLaunchSitemap(xml));
        } catch (error) { next(error); }
      });
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    alliancePrerenderPlugin(),
    launchSitemapPlugin(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
