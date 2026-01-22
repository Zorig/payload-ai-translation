'use client'

import type { Locale } from 'payload'

import {
  Button,
  Modal,
  ReactSelect,
  type ReactSelectOption,
  toast,
  useConfig,
  useDocumentInfo,
  useLocale,
  useModal,
} from '@payloadcms/ui'
import { type FC, useCallback, useMemo, useState } from 'react'

import './TranslateButton.css'

const MODAL_SLUG = 'translate-document-modal'

export const TranslateButton: FC = () => {
  const { config } = useConfig()
  const { id, collectionSlug } = useDocumentInfo()
  const locale = useLocale()
  const { closeModal, openModal } = useModal()
  const [isTranslating, setIsTranslating] = useState(false)
  const [selectedLocale, setSelectedLocale] = useState<ReactSelectOption | null>(null)

  const availableTargetLocales = useMemo(() => {
    const localization = config.localization
    const locales = localization ? localization.locales : []
    const currentCode = locale?.code

    return locales.filter((item: Locale | string) => {
      const code = typeof item === 'string' ? item : item.code
      return code !== currentCode
    })
  }, [config.localization, locale?.code])

  const handleTranslate = useCallback(async () => {
    if (!collectionSlug || !id || !locale?.code || !selectedLocale) {
      return
    }

    setIsTranslating(true)
    closeModal(MODAL_SLUG)

    const targetLocales =
      selectedLocale.value === '__all__'
        ? availableTargetLocales.map((item: Locale | string) =>
            typeof item === 'string' ? item : item.code,
          )
        : [selectedLocale.value]

    try {
      const apiURL = `${config.serverURL ?? ''}${config.routes.api}/translate`

      const response = await fetch(apiURL, {
        body: JSON.stringify({
          collection: collectionSlug,
          documentId: id,
          sourceLocale: locale.code,
          targetLocales,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || 'Translation complete')
      } else {
        toast.error(result.error || 'Translation failed')
      }
    } catch (error) {
      toast.error('Translation request failed')
      console.error('Translation error:', error)
    } finally {
      setIsTranslating(false)
      setSelectedLocale(null)
    }
  }, [availableTargetLocales, closeModal, collectionSlug, config, id, locale?.code, selectedLocale])

  const handleCancel = useCallback(() => {
    setSelectedLocale(null)
    closeModal(MODAL_SLUG)
  }, [closeModal])

  if (!config.localization || availableTargetLocales.length === 0 || !id) {
    return null
  }

  const localeOptions: ReactSelectOption[] = [
    { label: 'Translate to All', value: '__all__' },
    ...availableTargetLocales.map((item: Locale | string) => {
      if (typeof item === 'string') {
        return { label: item.toUpperCase(), value: item }
      }
      return {
        label: typeof item.label === 'string' ? item.label : item.code.toUpperCase(),
        value: item.code,
      }
    }),
  ]

  return (
    <>
      <Button
        buttonStyle="secondary"
        disabled={isTranslating}
        onClick={() => openModal(MODAL_SLUG)}
      >
        {isTranslating ? 'Translating...' : 'Translate'}
      </Button>
      <Modal className="translate-modal" slug={MODAL_SLUG}>
        <div className="translate-modal__wrapper">
          <div className="translate-modal__content">
            <h3>Translate Document</h3>
            <p>
              Translate content from <strong>{locale?.code?.toUpperCase()}</strong> to:
            </p>
            <div className="translate-modal__select">
              <ReactSelect
                isClearable
                onChange={(option) => setSelectedLocale(option as ReactSelectOption)}
                options={localeOptions}
                placeholder="Select target locale..."
                value={selectedLocale ?? undefined}
              />
            </div>
          </div>
          <div className="translate-modal__controls">
            <Button buttonStyle="secondary" onClick={handleCancel} size="medium">
              Cancel
            </Button>
            <Button disabled={!selectedLocale} onClick={handleTranslate} size="medium">
              Translate
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
