import type { PayloadHandler } from 'payload'

import type { TranslateRequestBody, TranslateResponse } from './types.js'

import { applyTranslations } from './applyTranslations.js'
import { extractTranslatableFields } from './extractTranslatableFields.js'
import { translateWithGemini } from './gemini.js'

export const translateHandler: PayloadHandler = async (req) => {
  try {
    const { payload, user } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized', success: false } as TranslateResponse, {
        status: 401,
      })
    }

    const body = (await req.json?.()) as TranslateRequestBody | undefined
    if (!body) {
      return Response.json(
        { error: 'Invalid request body', success: false } as TranslateResponse,
        { status: 400 },
      )
    }

    const { collection, documentId, sourceLocale, targetLocales } = body

    if (!collection || !documentId || !sourceLocale || !targetLocales || targetLocales.length === 0) {
      return Response.json(
        { error: 'Missing required fields', success: false } as TranslateResponse,
        { status: 400 },
      )
    }

    const apiKey =
      ((payload.config.custom as Record<string, unknown>)?.translateApiKey as string | undefined) ??
      process.env.GEMINI_API_KEY

    if (!apiKey) {
      return Response.json(
        { error: 'Translation API key not configured', success: false } as TranslateResponse,
        { status: 500 },
      )
    }

    if (!(collection in payload.collections)) {
      return Response.json({ error: 'Collection not found', success: false } as TranslateResponse, {
        status: 404,
      })
    }

    const collectionSlug = collection as keyof typeof payload.collections

    const localization = payload.config.localization
    if (!localization) {
      return Response.json(
        { error: 'Localization is not configured', success: false } as TranslateResponse,
        { status: 500 },
      )
    }

    const localeCodes = getLocaleCodes(localization.locales)

    if (!isLocaleCode(sourceLocale, localeCodes)) {
      return Response.json({ error: 'Invalid source locale', success: false } as TranslateResponse, {
        status: 400,
      })
    }

    const validTargetLocales = targetLocales.filter((locale): locale is AppLocale =>
      isLocaleCode(locale, localeCodes),
    )
    if (validTargetLocales.length === 0) {
      return Response.json({ error: 'Invalid target locales', success: false } as TranslateResponse, {
        status: 400,
      })
    }

    const document = await payload.findByID({
      id: documentId,
      collection: collectionSlug,
      depth: 0,
      locale: sourceLocale,
    })

    if (!document) {
      return Response.json({ error: 'Document not found', success: false } as TranslateResponse, {
        status: 404,
      })
    }

    const collectionConfig = payload.collections[collectionSlug]?.config
    if (!collectionConfig) {
      return Response.json({ error: 'Collection not found', success: false } as TranslateResponse, {
        status: 404,
      })
    }

    const documentData = document as unknown as Record<string, unknown>

    const translatableFields = extractTranslatableFields(documentData, collectionConfig.fields)
    if (translatableFields.length === 0) {
      return Response.json({
        message: 'No translatable fields found',
        success: true,
        translatedFields: 0,
        translatedLocales: 0,
      } as TranslateResponse)
    }

    const texts = translatableFields.map((field) => field.value)

    for (const targetLocale of validTargetLocales) {
      const translations = await translateWithGemini({
        apiKey,
        sourceLocale,
        targetLocale,
        texts,
      })

      const updatedData = applyTranslations(documentData, translatableFields, translations)
      const dataToUpdate = removeSystemFields(updatedData)

      await payload.update({
        id: documentId,
        collection: collectionSlug,
        data: dataToUpdate,
        locale: targetLocale,
      })
    }

    return Response.json({
      message: `Successfully translated ${translatableFields.length} field(s) to ${validTargetLocales.length} locale(s)`,
      success: true,
      translatedFields: translatableFields.length,
      translatedLocales: validTargetLocales.length,
    } as TranslateResponse)
  } catch (error) {
    console.error('Translation error:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Translation failed',
        success: false,
      } as TranslateResponse,
      { status: 500 },
    )
  }
}

type AppLocale = string

function isLocaleCode(value: string, locales: AppLocale[]): value is AppLocale {
  return locales.includes(value)
}

function getLocaleCodes(locales: Array<string | { code: string }> | undefined): AppLocale[] {
  if (!locales) {
    return []
  }

  return locales.map((locale) => (typeof locale === 'string' ? locale : locale.code))
}

function isLexicalState(obj: Record<string, unknown>): boolean {
  return 'root' in obj && typeof obj.root === 'object' && obj.root !== null && 'children' in obj.root
}

function removeSystemFields(obj: Record<string, unknown>, isRoot = true): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'createdAt' || key === 'updatedAt') {
      continue
    }

    if (key === 'id' && isRoot) {
      continue
    }

    if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return removeSystemFields(item as Record<string, unknown>, false)
        }
        return item
      })
      continue
    }

    if (value && typeof value === 'object') {
      if (isLexicalState(value as Record<string, unknown>)) {
        result[key] = value
      } else {
        result[key] = removeSystemFields(value as Record<string, unknown>, false)
      }
      continue
    }

    result[key] = value
  }

  return result
}
