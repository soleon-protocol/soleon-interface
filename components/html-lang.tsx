'use client';

import { useEffect } from 'react';

interface HtmlLangProps {
  locale: string;
}

export function HtmlLang({ locale }: HtmlLangProps) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
