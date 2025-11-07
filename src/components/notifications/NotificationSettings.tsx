import { Bell, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useNotificationPreferences, useFCMToken } from '@/hooks/useNotifications';
import { sendTestNotification } from '@/services/notificationService';
import { testNotificationSound } from '@/lib/notificationSound';
import { toast } from 'sonner';

export const NotificationSettings = () => {
  const { preferences, updatePreferences, isLoading } = useNotificationPreferences();
  const { permission, requestPermission, isPermissionGranted } = useFCMToken();

  const handleToggle = (key: string, value: boolean) => {
    if (preferences) {
      updatePreferences({
        ...preferences,
        [key]: value
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification('Test Notification', 'If you see this, notifications are working! 🎉');
      toast.success('Test notification sent');
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const handleTestSound = () => {
    const volume = preferences?.soundVolume ?? 0.7;
    testNotificationSound(volume);
    toast.success('Test sound played');
  };

  const handleVolumeChange = (value: number[]) => {
    if (preferences) {
      updatePreferences({
        ...preferences,
        soundVolume: value[0]
      });
    }
  };

  if (isLoading || !preferences) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Browser Permission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Enable push notifications to receive real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permission === 'denied' ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          ) : permission === 'granted' ? (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Notifications are enabled
              </div>
            </div>
          ) : (
            <Button onClick={requestPermission}>
              Enable Browser Notifications
            </Button>
          )}
          
          {isPermissionGranted && (
            <Button variant="outline" onClick={handleTestNotification}>
              Send Test Notification
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications in your browser
              </p>
            </div>
            <Switch
              id="push"
              checked={preferences.pushEnabled}
              onCheckedChange={(checked) => handleToggle('pushEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email"
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) => handleToggle('emailEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inApp">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications within the application
              </p>
            </div>
            <Switch
              id="inApp"
              checked={preferences.inAppEnabled}
              onCheckedChange={(checked) => handleToggle('inAppEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {preferences.soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
            Notification Sound
          </CardTitle>
          <CardDescription>
            Control notification sound settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound">Enable Sound</Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when receiving notifications
              </p>
            </div>
            <Switch
              id="sound"
              checked={preferences.soundEnabled ?? true}
              onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
            />
          </div>

          {preferences.soundEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="volume">Volume</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((preferences.soundVolume ?? 0.7) * 100)}%
                  </span>
                </div>
                <Slider
                  id="volume"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[preferences.soundVolume ?? 0.7]}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestSound}
                    className="mt-2"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Test Sound
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Module Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Module Notifications</CardTitle>
          <CardDescription>
            Control which types of notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="engagement">Engagement Notifications</Label>
              <p className="text-sm text-muted-foreground">
                New engagements, status updates, deadlines
              </p>
            </div>
            <Switch
              id="engagement"
              checked={preferences.engagementNotifications}
              onCheckedChange={(checked) => handleToggle('engagementNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="document">Document Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Document requests, uploads, and reviews
              </p>
            </div>
            <Switch
              id="document"
              checked={preferences.documentNotifications}
              onCheckedChange={(checked) => handleToggle('documentNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="task">Task Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Task assignments and checklist updates
              </p>
            </div>
            <Switch
              id="task"
              checked={preferences.taskNotifications}
              onCheckedChange={(checked) => handleToggle('taskNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="user">User Management Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Password changes, subscription reminders
              </p>
            </div>
            <Switch
              id="user"
              checked={preferences.userNotifications}
              onCheckedChange={(checked) => handleToggle('userNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system">System Notifications</Label>
              <p className="text-sm text-muted-foreground">
                System updates and announcements
              </p>
            </div>
            <Switch
              id="system"
              checked={preferences.systemNotifications}
              onCheckedChange={(checked) => handleToggle('systemNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

