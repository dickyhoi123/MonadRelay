import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/providers';

export const metadata: Metadata = {
  title: {
    default: 'Monad Relay',
    template: '%s | Monad Relay',
  },
  description:
    '基于Monad区块链的多人协作音乐创作平台，支持接力式音轨合成、实时聊天、Web3钱包集成。',
  keywords: [
    'Monad Relay',
    'Blockchain Music',
    'Web3 Music',
    'Monad',
    '音乐创作',
    '区块链音乐',
    '多人协作',
    '音轨合成',
    'NFT',
    'Web3',
  ],
  authors: [{ name: 'Monad Relay Team' }],
  generator: 'Monad Relay',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: 'Monad Relay | 区块链协作音乐创作平台',
    description:
      '基于Monad区块链的多人协作音乐创作平台，支持接力式音轨合成、实时聊天、Web3钱包集成。',
    siteName: 'Monad Relay',
    locale: 'zh_CN',
    type: 'website',
    // images: [
    //   {
    //     url: '',
    //     width: 1200,
    //     height: 630,
    //     alt: 'Monad Relay - 区块链音乐创作',
    //   },
    // ],
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'Monad Relay | Blockchain Music Collaboration',
  //   description:
  //     'Multi-collaborative music creation platform on Monad blockchain with relay track synthesis.',
  //   // images: [''],
  // },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
