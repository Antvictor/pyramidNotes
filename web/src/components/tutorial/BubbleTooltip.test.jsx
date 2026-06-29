import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import en from '@/i18n/resources/en'
import zhCN from '@/i18n/resources/zh-CN'
import BubbleTooltip from './BubbleTooltip'

describe('BubbleTooltip localization', () => {
  it('updates active tutorial content when language changes', async () => {
    const instance = createInstance()
    await instance
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: en },
          'zh-CN': { translation: zhCN },
        },
        lng: 'en',
        fallbackLng: 'en',
      })

    render(
      <I18nextProvider i18n={instance}>
        <BubbleTooltip
          step={{
            bubbleContentKey: 'tutorial.steps.openEditor',
            buttons: ['skip'],
          }}
          phase="idle"
          targetRect={{ left: 0, top: 0, width: 100, height: 40, bottom: 40 }}
          onNext={vi.fn()}
          onSkip={vi.fn()}
        />
      </I18nextProvider>,
    )

    expect(screen.getByText('Double-click any node to open its note editor.')).toBeInTheDocument()

    await act(async () => {
      await instance.changeLanguage('zh-CN')
    })

    expect(screen.getByText('双击任意节点进入笔记编辑器。')).toBeInTheDocument()
  })
})
