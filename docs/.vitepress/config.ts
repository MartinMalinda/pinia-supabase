import { defineConfig } from 'vitepress'


export default defineConfig({
  title: "🚦vue-vite-library-starter",
  description:
    "Description of the library",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
    ],
    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Introduction', link: '/introduction/' },
          ],
        },
      ],
    },
  },
});
