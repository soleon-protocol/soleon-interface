'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet-button';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  href: string;
  key: string;
}

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  navItems: readonly NavItem[];
}

export function MobileNav({ open, onClose, navItems }: MobileNavProps) {
  const t = useTranslations('nav');
  const locale = useLocale();

  const getLocalizedHref = (href: string) => `/${locale}${href === '/' ? '' : href}`;

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-background border-l border-border p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <Link href={getLocalizedHref('/')} onClick={onClose} className="flex items-center gap-2">
                <Image
                  src="/images/logo-symbol.png"
                  alt="Soleon"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                <span className="font-serif text-lg font-bold text-gradient-gold">
                  SOLEON
                </span>
              </Link>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-6 w-6" />
                <span className="sr-only">{t('closeMenu')}</span>
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-2">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={getLocalizedHref(item.href)}
                    onClick={onClose}
                    className="block rounded-lg px-4 py-3 text-lg font-medium text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {t(item.key)}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Wallet Button */}
            <div className="mt-8">
              <WalletButton />
            </div>

            {/* Decorative element */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
