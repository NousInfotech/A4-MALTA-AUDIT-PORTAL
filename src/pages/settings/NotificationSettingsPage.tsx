import { NotificationSettings } from '@/components/notifications';

export const NotificationSettingsPage = () => {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how you receive notifications and alerts
        </p>
      </div>
      <NotificationSettings />
    </div>
  );
};

