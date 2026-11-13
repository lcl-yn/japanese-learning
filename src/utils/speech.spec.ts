import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { restartJapanese, stopSpeaking } from './speech'

describe('restartJapanese', () => {
  const speak = vi.fn()
  const cancel = vi.fn()
  const getVoices = vi.fn(() => [] as SpeechSynthesisVoice[])

  beforeEach(() => {
    speak.mockReset()
    cancel.mockReset()
    getVoices.mockReset()
    getVoices.mockReturnValue([])
    vi.stubGlobal('speechSynthesis', {
      speak,
      cancel,
      getVoices,
    })
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = ''
        voice: SpeechSynthesisVoice | null = null
        onend: (() => void) | null = null
        onerror: (() => void) | null = null
        constructor(public text: string) {}
      },
    )
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('cancels current speech and reads trimmed Japanese after a short gap', async () => {
    restartJapanese('  こんにちは  ')

    expect(cancel).toHaveBeenCalledOnce()
    expect(speak).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(speak).toHaveBeenCalledOnce()
    const uttered = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(uttered.text).toBe('こんにちは')
    expect(uttered.lang).toBe('ja-JP')
  })

  it('keeps only the latest phrase when triggered again before speaking', async () => {
    restartJapanese('あ')
    restartJapanese('い')
    await vi.runAllTimersAsync()

    expect(speak).toHaveBeenCalledOnce()
    expect((speak.mock.calls[0][0] as SpeechSynthesisUtterance).text).toBe('い')
  })

  it('stops without speaking when the text is blank', async () => {
    restartJapanese('   ')
    await vi.runAllTimersAsync()

    expect(cancel).toHaveBeenCalledOnce()
    expect(speak).not.toHaveBeenCalled()
  })

  it('calls onend after the utterance finishes', async () => {
    const onend = vi.fn()
    restartJapanese('あ', null, { onend })
    await vi.runAllTimersAsync()

    const uttered = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    uttered.onend?.(new Event('end'))
    expect(onend).toHaveBeenCalledOnce()
  })

  it('drops a restart that has not spoken yet when speech is stopped', async () => {
    restartJapanese('あ')
    stopSpeaking()
    await vi.runAllTimersAsync()

    expect(speak).not.toHaveBeenCalled()
  })

  it('binds the voice the user picked', async () => {
    const voice = { name: 'Nanami', lang: 'ja-JP', voiceURI: 'nanami' } as SpeechSynthesisVoice
    getVoices.mockReturnValue([voice])

    restartJapanese('あ', 'nanami')
    await vi.runAllTimersAsync()

    expect((speak.mock.calls[0][0] as SpeechSynthesisUtterance).voice).toBe(voice)
  })
})
