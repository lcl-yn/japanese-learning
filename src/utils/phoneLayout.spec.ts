import { describe, expect, it } from 'vitest'
import { installPhoneLayout, isPhoneLayout, phoneLayout, type PhoneLayoutSignals } from './phoneLayout'

function signals(patch: Partial<PhoneLayoutSignals> = {}): PhoneLayoutSignals {
  return {
    narrow: false,
    hoverNone: false,
    pointerCoarse: false,
    ...patch,
  }
}

describe('isPhoneLayout', () => {
  it('uses the phone layout only when the viewport is narrow and the primary pointer is touch', () => {
    expect(isPhoneLayout(signals({ narrow: true, hoverNone: true, pointerCoarse: true }))).toBe(true)
  })

  it('keeps the desktop layout when a computer window is narrowed', () => {
    expect(isPhoneLayout(signals({ narrow: true }))).toBe(false)
    expect(isPhoneLayout(signals({ narrow: true, hoverNone: true }))).toBe(false)
    expect(isPhoneLayout(signals({ narrow: true, pointerCoarse: true }))).toBe(false)
  })

  it('keeps the desktop layout on a wide touch screen', () => {
    expect(isPhoneLayout(signals({ hoverNone: true, pointerCoarse: true }))).toBe(false)
  })
})

describe('installPhoneLayout', () => {
  it('follows viewport and pointer changes onto the document', () => {
    const matches: Record<string, boolean> = {
      '(max-width: 959px)': false,
      '(hover: none)': false,
      '(pointer: coarse)': false,
    }
    const listeners = new Map<string, Set<() => void>>()
    window.matchMedia = ((query: string) => ({
      get matches() {
        return matches[query] ?? false
      },
      addEventListener: (_type: string, callback: () => void) => {
        const group = listeners.get(query) ?? new Set()
        group.add(callback)
        listeners.set(query, group)
      },
      removeEventListener: () => undefined,
    })) as typeof window.matchMedia

    installPhoneLayout()
    expect(phoneLayout.value).toBe(false)
    expect(document.documentElement.dataset.layout).toBe('desktop')

    matches['(max-width: 959px)'] = true
    listeners.get('(max-width: 959px)')?.forEach((callback) => callback())
    expect(phoneLayout.value).toBe(false)
    expect(document.documentElement.dataset.layout).toBe('desktop')

    matches['(hover: none)'] = true
    matches['(pointer: coarse)'] = true
    listeners.get('(pointer: coarse)')?.forEach((callback) => callback())
    expect(phoneLayout.value).toBe(true)
    expect(document.documentElement.dataset.layout).toBe('phone')
  })
})
