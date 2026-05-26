export const BrandAssets = {
  casino: {
    alt: "Echo's Gambit casino logo",
    uri: 'https://i.ibb.co/N68rV9hB/Echo-s-Gambit-Casino-Logo.png',
  },
  echo: {
    alt: 'Echo of Elsewhere logo',
    uri: 'https://i.ibb.co/jvGbQjmH/Echo-of-Elsewhere-logo-Esper.png',
  },
  enterprises: {
    alt: 'Echo Enterprises logo',
    uri: 'https://i.ibb.co/mVK9yQQv/Echo-Enterprises-Logo.png',
  },
  reserve: {
    alt: 'The Echo Reserve bank logo',
    uri: 'https://i.ibb.co/rR1VMCSW/The-Echo-Reserve-Logo.png',
  },
  stockExchange: {
    alt: 'Echo Stock Exchange logo',
    uri: 'https://i.ibb.co/rRnjd5KS/Echo-Stock-Exchange-Logo.png',
  },
} as const;

export type BrandAssetKey = keyof typeof BrandAssets;
