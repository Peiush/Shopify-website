# HYPEFORGE

A sneaker and streetwear store built while learning Shopify development.

| Folder | What it is |
|---|---|
| `storefront/` | Custom headless storefront: Shopify Hydrogen (React Router 7), Tailwind v4, GSAP animations |
| `first-app/` | Shopify app (React Router template, Polaris, Admin GraphQL API) plus a catalog import script |
| `theme-previews/` | Color theme exploration sheets |

## Run the storefront

```bash
cd storefront
npm install
npx shopify hydrogen link   # connect to your store's Hydrogen storefront
npm run dev
```

Design rules live in `storefront/design-system/MASTER.md`.

## Run the app

```bash
cd first-app
npm install
shopify app dev
```

`first-app/scripts/import-catalog.py` copies a demo catalog into a dev store
(`products`, then `collections`).
