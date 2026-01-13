import { MetadataRoute } from 'next'
import { CLIENT_CONFIG } from '@/client.config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CLIENT_CONFIG.appName,
    short_name: CLIENT_CONFIG.shortName,
    description: CLIENT_CONFIG.description,
    start_url: '/',
    display: 'standalone',
    background_color: CLIENT_CONFIG.backgroundColor,
    theme_color: CLIENT_CONFIG.themeColor,
    orientation: 'portrait-primary',
    lang: CLIENT_CONFIG.lang,
    dir: CLIENT_CONFIG.dir,
    categories: ['business', 'productivity', 'shopping'],
    icons: [
      {
        src: CLIENT_CONFIG.logoPath,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
