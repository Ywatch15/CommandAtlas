import './globals.css';

export const metadata = {
  title: 'CommandAtlas',
  description: 'Offline-first, curated developer command reference platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
