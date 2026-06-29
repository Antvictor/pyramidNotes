import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from './Settings'
import { renderWithLanguage } from '@/i18n/test-utils'

describe('Settings language preference', () => {
  beforeEach(() => {
    window.api = {
      getSettings: vi.fn().mockResolvedValue({
        theme: 'system',
        storagePath: '',
        autoUpdate: true,
        language: 'system',
      }),
      saveSettings: vi.fn().mockResolvedValue(true),
      selectDirectory: vi.fn(),
      getVersion: vi.fn().mockReturnValue('1.0.0'),
    }
  })

  it('saves an explicit English preference', async () => {
    const user = userEvent.setup()
    await renderWithLanguage(<Settings />, 'en')

    await user.click(await screen.findByRole('button', { name: /follow system/i }))
    await user.click(screen.getByRole('button', { name: /^english$/i }))

    expect(window.api.saveSettings).toHaveBeenCalledWith({ language: 'en' })
  })
})
