import SettingsPageClient from './SettingsPageClient.jsx';

export const metadata = {
  title: 'Settings — CommandAtlas',
  robots: {
    index: false,
    follow: true,
  },
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
