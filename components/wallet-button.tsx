'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SOLEON_CONFIG } from '@/lib/solana/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, ExternalLink } from 'lucide-react';

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const t = useTranslations('nav');

  const handleConnect = () => {
    setVisible(true);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
    }
  };

  const handleViewExplorer = () => {
    if (publicKey) {
      const clusterParam = SOLEON_CONFIG.cluster === 'devnet' ? '?cluster=devnet' : '';
      window.open(
        `https://explorer.solana.com/address/${publicKey.toBase58()}${clusterParam}`,
        '_blank'
      );
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected || !publicKey) {
    return (
      <Button
        onClick={handleConnect}
        className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold glow-gold-sm"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {t('connectWallet')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-primary/50 text-primary hover:bg-primary/10"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {formatAddress(publicKey.toBase58())}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          {t('copyAddress')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewExplorer}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('viewExplorer')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => disconnect()} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {t('disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
