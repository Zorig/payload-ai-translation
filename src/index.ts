import type { Config } from 'payload'

import type { PayloadTranslateConfig } from './payloadTranslate/types.js'

import { translateHandler } from './payloadTranslate/translateHandler.js'

export type { PayloadTranslateConfig }

export const payloadTranslate =
  (pluginOptions: PayloadTranslateConfig) =>
  (config: Config): Config => {
    if (pluginOptions.disabled) {
      return config
    }

    const resolvedApiKey = pluginOptions.apiKey ?? process.env.GEMINI_API_KEY

    if (!config.custom) {
      config.custom = {}
    }

    ;(config.custom as Record<string, unknown>).translateApiKey = resolvedApiKey

    if (!config.collections) {
      config.collections = []
    }

    const collections = pluginOptions.collections ?? []

    for (const collectionSlug of collections) {
      const collection = config.collections.find((entry) => entry.slug === collectionSlug)

      if (collection) {
        if (!collection.admin) {
          collection.admin = {}
        }
        if (!collection.admin.components) {
          collection.admin.components = {}
        }
        if (!collection.admin.components.edit) {
          collection.admin.components.edit = {}
        }
        if (!collection.admin.components.edit.beforeDocumentControls) {
          collection.admin.components.edit.beforeDocumentControls = []
        }

        collection.admin.components.edit.beforeDocumentControls.push(
          'ai-translation/client#TranslateButton',
        )
      }
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    config.endpoints.push({
      handler: translateHandler,
      method: 'post',
      path: '/translate',
    })

    return config
  }

export const aiTranslation = payloadTranslate
