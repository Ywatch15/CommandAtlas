import './globals.css';

export const metadata = {
  title: 'CommandAtlas',
  description: 'Offline-first, curated developer command reference platform.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#090d16',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {process.env.NEXT_PUBLIC_ENABLE_SW === 'true' && (
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
