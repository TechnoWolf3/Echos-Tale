import type { PropsWithChildren } from 'react';

import { GameTheme } from '@/constants/theme';

const appBackground = GameTheme.colors.background;

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ backgroundColor: appBackground }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content={appBackground} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Echo’s Tale" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{
            __html: `#root,body,html{height:100%;background:${appBackground}}body{margin:0;overflow:hidden;background:${appBackground};color-scheme:dark}#root{display:flex;min-height:100%;background:${appBackground}}`,
          }}
        />
      </head>
      <body style={{ backgroundColor: appBackground }}>{children}</body>
    </html>
  );
}
