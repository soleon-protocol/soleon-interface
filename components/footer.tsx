'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Twitter, Github } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const locale = useLocale();

  const getLocalizedHref = (href: string) => `/${locale}${href === '/' ? '' : href}`;

  const quickLinks = [
    { href: '/', label: tNav('home') },
    { href: '/tokenomics', label: tNav('tokenomics') },
    { href: '/how-it-works', label: tNav('howItWorks') },
  ];

  const resources = [
    { href: '/whitepaper', label: tNav('whitepaper') },
    { href: '/roadmap', label: tNav('roadmap') },
    { href: '/guides', label: tNav('guides') },
  ];

  const socialLinks = [
    { href: null, icon: Twitter, label: 'X', pending: true },
    { href: 'https://github.com/soleon-protocol/soleon-interface', icon: Github, label: 'GitHub', pending: false },
  ];

  return (
    <footer className="border-t border-border/50 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href={getLocalizedHref('/')} className="flex items-center gap-3">
              <Image
                src="/images/logo-symbol.png"
                alt="Soleon"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <span className="font-serif text-xl font-bold text-gradient-gold">
                SOLEON
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('description')}
            </p>
            {/* Social Links */}
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                social.pending ? (
                  <span
                    key={social.label}
                    className="text-muted-foreground/50 cursor-not-allowed"
                    title={t('socialPending')}
                  >
                    <social.icon className="h-5 w-5" />
                    <span className="sr-only">{social.label} - {t('socialPending')}</span>
                  </span>
                ) : (
                  <a
                    key={social.label}
                    href={social.href ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <social.icon className="h-5 w-5" />
                    <span className="sr-only">{social.label}</span>
                  </a>
                )
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground">{t('quickLinks')}</h3>
            <ul className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={getLocalizedHref(link.href)}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-foreground">{t('resources')}</h3>
            <ul className="mt-4 space-y-2">
              {resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={getLocalizedHref(link.href)}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Token Info */}
          <div>
            <h3 className="font-semibold text-foreground">{t('tokenInfo')}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>{t('network')}: Solana</li>
              <li>{t('tokenInfo')}: SOLEON</li>
              <li>{t('ticker')}: SEON</li>
              <li>{t('supply')}: 444,444,444</li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-12 border-t border-border/50 pt-8">
          <p className="text-xs text-muted-foreground/70">
            {t('disclaimer')}
          </p>
          <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Soleon. {t('rights')}
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent sm:mx-8" />
          </div>
        </div>
      </div>
    </footer>
  );
}
