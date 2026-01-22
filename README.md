# AI Translation Payload Plugin

Translate localized Payload documents with a single click using Google Gemini. The plugin adds a
Translate button to the admin edit view for configured collections and writes translations back to
localized fields.

## Features

- Translate localized text, textarea, and richText fields (Lexical), including nested arrays, blocks,
  and groups.
- Translate to one locale or all locales from the current document locale.
- Uses authenticated Payload endpoints and preserves formatting, placeholders, and URLs.

## Requirements

- Payload 3 with localization enabled.
- A Gemini API key via `GEMINI_API_KEY` or the `apiKey` option.
- Collections configured with localized fields.

## Install

```bash
pnpm add ai-translation
# or
npm install ai-translation
# or
yarn add ai-translation
```

## Setup

```ts
import { payloadTranslate } from 'ai-translation'

export default buildConfig({
  localization: {
    locales: ['en', 'fr', 'es'],
    defaultLocale: 'en',
  },
  plugins: [
    payloadTranslate({
      collections: ['posts', 'pages'],
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
})
```

You can also import the alias:

```ts
import { aiTranslation } from 'ai-translation'
```

## Usage

1. Open a document in the Admin UI for a configured collection.
2. Click Translate, choose a target locale (or Translate to All), and confirm.

## Options

- `collections` (required): collection slugs to add the Translate button to.
- `apiKey` (optional): Gemini API key, defaults to `GEMINI_API_KEY`.
- `disabled` (optional): disable the plugin without uninstalling it.

## How It Works

- Adds a `/translate` POST endpoint that requires an authenticated user session.
- Reads the document in the source locale and extracts localized `text`, `textarea`, and Lexical
  `richText` fields.
- Sends all text to Gemini (gemini-3-flash-preview) per target locale and writes the translations to
  the locale.

## Development

- `pnpm dev` to run the dev Payload app in `dev/` (copy `dev/.env.example` to `dev/.env`).
- `pnpm test` to run integration and Playwright tests.
