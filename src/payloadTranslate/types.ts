import type { CollectionSlug } from 'payload'

export type PayloadTranslateConfig = {
  apiKey?: string
  collections: CollectionSlug[]
  disabled?: boolean
}

export type TranslateRequestBody = {
  collection: string
  documentId: number | string
  sourceLocale: string
  targetLocales: string[]
}

export type TranslateResponse = {
  error?: string
  message?: string
  success: boolean
  translatedFields?: number
  translatedLocales?: number
}

export type TranslatableField = {
  lexicalPath?: string
  path: string
  type: 'richText' | 'text' | 'textarea'
  value: string
}

export type GeminiTranslationRequest = {
  sourceLocale: string
  targetLocale: string
  texts: string[]
}
