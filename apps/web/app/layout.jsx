import './globals.css';

export const metadata = {
  title: 'CommandAtlas',
  description: 'Offline-first, curated developer command reference platform.',
  manifest: '/manifest.json',
  applicationName: 'CommandAtlas',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CommandAtlas',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: '#0B0D10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW !== 'false';

  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CommandAtlas" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        {enableSW && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
