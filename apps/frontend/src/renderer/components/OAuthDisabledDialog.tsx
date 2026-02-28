import { useTranslation } from 'react-i18next';
import { AlertTriangle, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface OAuthDisabledDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
}

/**
 * Dialog displayed when agent/terminal startup fails because OAuth is disabled
 * and no valid API profile is configured.
 */
export function OAuthDisabledDialog({
  open,
  onOpenChange,
  onOpenSettings,
}: OAuthDisabledDialogProps) {
  const { t } = useTranslation(['settings', 'common']);

  const handleOpenSettings = () => {
    onOpenChange(false);
    onOpenSettings();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg">
              {t('settings:errors.oauthDisabledNoApiProfile.title')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-foreground">
            {t('settings:errors.oauthDisabledNoApiProfile.message')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('settings:errors.oauthDisabledNoApiProfile.action')}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:mr-auto">
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleOpenSettings} className="gap-2">
            <Settings className="h-4 w-4" />
            {t('common:prReview.openSettings')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
