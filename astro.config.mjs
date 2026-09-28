// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Every page is rendered on demand: auth checks and signed video URLs have to
  // happen on the server, and there is no page here worth prerendering.
  output: 'server',
  adapter: cloudflare({
    // There is no photography anywhere in this interface — the videos are the images —
    // so there is nothing to transform. Passthrough avoids provisioning a Cloudflare
    // Images binding that would never be asked to do anything.
    imageService: 'passthrough',
  }),

  // Self-hosted from the build rather than fetched from Google at runtime, so the
  // app makes no third-party request and the type never flashes.
  fonts: [
    {
      name: 'EB Garamond',
      cssVariable: '--font-serif',
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
    },
    {
      name: 'Manrope',
      cssVariable: '--font-sans',
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700],
      subsets: ['latin'],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
