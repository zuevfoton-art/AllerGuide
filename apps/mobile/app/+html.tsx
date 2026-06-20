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
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
