"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Language } from "@/i18n/dictionaries";

export function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium">{t("language")}</div>
      <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="hi">हिंदी</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
