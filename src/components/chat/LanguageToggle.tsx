'use client';

import type { LanguageCode } from '@/types';
import { Button } from '@/components/ui/button';

interface LanguageToggleProps {
  selectedLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  disabled?: boolean;
}

export function LanguageToggle({ selectedLanguage, onLanguageChange, disabled }: LanguageToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={selectedLanguage === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onLanguageChange('en')}
        disabled={disabled}
        className="px-3 py-1 h-8"
      >
        EN
      </Button>
      <Button
        variant={selectedLanguage === 'te' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onLanguageChange('te')}
        disabled={disabled}
        className="px-3 py-1 h-8"
      >
        తె
      </Button>
    </div>
  );
}
