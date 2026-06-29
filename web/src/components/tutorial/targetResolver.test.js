import { describe, expect, it } from 'vitest'
import { findTutorialTarget } from './targetResolver'

describe('findTutorialTarget', () => {
  it('finds the storage button without reading its text', () => {
    document.body.innerHTML = '<button data-tutorial-id="change-storage-directory">任意文本</button>'
    expect(findTutorialTarget({ type: 'change-dir-button' }))
      .toBe(document.querySelector('button'))
  })

  it('finds the shortcuts button after visible language changes', () => {
    document.body.innerHTML = '<button data-tutorial-id="open-shortcuts">Configure</button>'
    expect(findTutorialTarget({ type: 'shortcuts-button' }))
      .toBe(document.querySelector('button'))
  })
})
