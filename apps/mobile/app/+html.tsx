import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const responsiveCss = `
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100%;
  min-height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

#root,
body > div {
  display: flex;
  min-height: 100%;
  min-height: 100dvh;
  flex: 1;
  width: 100%;
}

input,
textarea,
select {
  font-size: 16px !important;
}

@media (max-width: 480px) {
  input,
  textarea,
  select {
    font-size: 16px !important;
  }
}

:focus {
  outline: none;
}

:focus-visible {
  outline: 2px solid #2A9D8F;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(42,157,143,0.35);
  border-radius: 6px;
}

[data-tone="danger"]:focus-visible {
  outline-color: #B91C1C;
  box-shadow: 0 0 0 4px rgba(185,28,28,0.35);
}

a[href="#content"] {
  position: absolute;
  left: 8px;
  top: -80px;
  z-index: 1000;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 999px;
  background: #FFFFFF;
  border: 1px solid #2A9D8F;
  color: #2A9D8F;
  font: 600 14px/1.2 Inter, system-ui, sans-serif;
  text-decoration: none;
}

a[href="#content"]:focus,
a[href="#content"]:focus-visible {
  top: 8px;
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,600;0,8..60,700;1,8..60,600&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
