import './globals.css';

export const metadata = {
  title: 'CommandAtlas',
  description: 'Offline-first, curated developer command reference platform.',
  manifest: '/manifest.json',
  themeColor: '#090d16',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
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
      </body>
    </html>
  );
}
