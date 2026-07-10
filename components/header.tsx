'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { MobileNav } from '@/components/mobile-nav';

// Pages where wallet connection is useful
const walletPages = ['/genesis', '/staking', '/maintenance'];

const navItems = [
  { href: '/genesis', key: 'genesis' },
  { href: '/markets', key: 'markets' },
  { href: '/staking', key: 'staking' },
  { href: '/maintenance', key: 'maintenance' },
  { href: '/docs', key: 'docs' },
] as const;

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  
  // Check if current page needs wallet
  const showWallet = walletPages.some(page => pathname.includes(page));

  const getLocalizedHref = (href: string) => `/${locale}${href === '/' ? '' : href}`;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href={getLocalizedHref('/')} className="flex items-center gap-3">
            <Image
              src="/images/logo-symbol.png"
              alt="Soleon"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="hidden font-serif text-xl font-bold text-gradient-gold sm:block">
              SOLEON
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={getLocalizedHref(item.href)}
                className="px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {showWallet && (
              <div className="hidden sm:block">
                <WalletButton />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">{t('openMenu')}</span>
            </Button>
          </div>
        </div>
      </header>

      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={navItems}
      />
    </>
  );
}
