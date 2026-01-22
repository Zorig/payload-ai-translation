import type { TranslatableField } from './types.js'

export function applyTranslations(
  originalData: Record<string, unknown>,
  fields: TranslatableField[],
  translations: string[],
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(originalData)) as Record<string, unknown>

  fields.forEach((field, index) => {
    const translation = translations[index]
    if (translation === undefined) {
      return
    }

    if (field.type === 'richText' && field.lexicalPath) {
      applyLexicalTranslation(result, field.path, field.lexicalPath, translation)
    } else {
      setNestedValue(result, field.path, translation)
    }
  })

  return result
}

function applyLexicalTranslation(
  data: Record<string, unknown>,
  fieldPath: string,
  lexicalPath: string,
  translation: string,
): void {
  const lexicalState = getNestedValue(data, fieldPath)
  if (!lexicalState || typeof lexicalState !== 'object') {
    return
  }

  const pathParts = lexicalPath.split('.')
  let current: unknown = lexicalState

  for (let i = 0; i < pathParts.length; i++) {
    const key = pathParts[i]
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return
    }
  }

  if (current && typeof current === 'object' && 'text' in current) {
    ;(current as Record<string, unknown>).text = translation
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]

    if (!(key in current)) {
      current[key] = Number.isNaN(Number(nextKey)) ? {} : []
    }

    current = current[key] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
}
