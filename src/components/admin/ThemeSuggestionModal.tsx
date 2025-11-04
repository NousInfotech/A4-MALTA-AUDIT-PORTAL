// @ts-nocheck
import React from 'react';
import { ThemeSuggestion } from '@/contexts/BrandingContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Sparkles, X } from 'lucide-react';

interface ThemeSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: ThemeSuggestion[];
  onSelectTheme: (theme: ThemeSuggestion) => void;
  onSkip: () => void;
}

export const ThemeSuggestionModal: React.FC<ThemeSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  onSelectTheme,
  onSkip,
}) => {
  const [selectedTheme, setSelectedTheme] = React.useState<string | null>(null);

  const handleSelect = (theme: ThemeSuggestion) => {
    setSelectedTheme(theme.name);
    onSelectTheme(theme);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-accent" />
            AI-Generated Color Themes
          </DialogTitle>
          <DialogDescription>
            We've analyzed your logo and created beautiful color themes that match your brand.
            Choose one to apply, or continue with manual customization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No theme suggestions could be generated from your logo.</p>
              <p className="text-sm mt-2">You can still customize colors manually.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((theme, index) => (
                <Card
                  key={index}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:border-accent ${
                    selectedTheme === theme.name ? 'border-accent border-2' : ''
                  }`}
                  onClick={() => handleSelect(theme)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{theme.name}</h3>
                        <p className="text-sm text-muted-foreground">{theme.description}</p>
                      </div>
                      {selectedTheme === theme.name && (
                        <Check className="h-5 w-5 text-accent" />
                      )}
                    </div>

                    {/* Color Preview Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {/* Sidebar Background */}
                      <div className="space-y-1">
                        <div
                          className="h-16 rounded border"
                          style={{ backgroundColor: `hsl(${theme.colors.sidebar_background_color})` }}
                        />
                        <p className="text-xs text-center text-muted-foreground">Sidebar</p>
                      </div>

                      {/* Body Background */}
                      <div className="space-y-1">
                        <div
                          className="h-16 rounded border"
                          style={{ backgroundColor: `hsl(${theme.colors.body_background_color})` }}
                        />
                        <p className="text-xs text-center text-muted-foreground">Body</p>
                      </div>

                      {/* Primary Color */}
                      <div className="space-y-1">
                        <div
                          className="h-16 rounded border"
                          style={{ backgroundColor: `hsl(${theme.colors.primary_color})` }}
                        />
                        <p className="text-xs text-center text-muted-foreground">Primary</p>
                      </div>

                      {/* Accent Color */}
                      <div className="space-y-1">
                        <div
                          className="h-16 rounded border"
                          style={{ backgroundColor: `hsl(${theme.colors.accent_color})` }}
                        />
                        <p className="text-xs text-center text-muted-foreground">Accent</p>
                      </div>
                    </div>

                    {/* Mini Preview */}
                    <div 
                      className="h-20 rounded-lg border overflow-hidden flex"
                      style={{ backgroundColor: `hsl(${theme.colors.body_background_color})` }}
                    >
                      {/* Mini Sidebar */}
                      <div 
                        className="w-12 flex flex-col items-center justify-center gap-1"
                        style={{ 
                          backgroundColor: `hsl(${theme.colors.sidebar_background_color})`,
                          color: `hsl(${theme.colors.sidebar_text_color})`
                        }}
                      >
                        <div className="w-6 h-1 rounded" style={{ backgroundColor: 'currentColor', opacity: 0.7 }} />
                        <div className="w-6 h-1 rounded" style={{ backgroundColor: 'currentColor', opacity: 0.5 }} />
                        <div className="w-6 h-1 rounded" style={{ backgroundColor: 'currentColor', opacity: 0.5 }} />
                      </div>
                      
                      {/* Mini Content */}
                      <div className="flex-1 p-2 space-y-1">
                        <div 
                          className="h-2 rounded w-3/4"
                          style={{ backgroundColor: `hsl(${theme.colors.body_text_color})`, opacity: 0.3 }}
                        />
                        <div 
                          className="h-1.5 rounded w-full"
                          style={{ backgroundColor: `hsl(${theme.colors.body_text_color})`, opacity: 0.2 }}
                        />
                        <div className="flex gap-1 mt-2">
                          <div 
                            className="h-4 rounded w-12 text-[0.5rem] flex items-center justify-center font-medium"
                            style={{ 
                              backgroundColor: `hsl(${theme.colors.primary_color})`,
                              color: `hsl(${theme.colors.primary_foreground_color})`
                            }}
                          >
                            BTN
                          </div>
                          <div 
                            className="h-4 rounded w-12 text-[0.5rem] flex items-center justify-center font-medium"
                            style={{ 
                              backgroundColor: `hsl(${theme.colors.accent_color})`,
                              color: `hsl(${theme.colors.accent_foreground_color})`
                            }}
                          >
                            BTN
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      variant={selectedTheme === theme.name ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(theme);
                      }}
                    >
                      Apply This Theme
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button variant="ghost" onClick={onSkip}>
            <X className="h-4 w-4 mr-2" />
            Skip for now
          </Button>
          <p className="text-xs text-muted-foreground">
            You can always customize colors manually later
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

