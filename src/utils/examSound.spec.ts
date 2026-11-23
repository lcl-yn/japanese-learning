import { afterEach, describe, expect, it, vi } from 'vitest'

interface FakeSource {
  buffer: AudioBuffer | null
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

function installAudio() {
  const sources: FakeSource[] = []
  const resume = vi.fn(async function resume(this: { state: AudioContextState }) {
    this.state = 'running'
  })
  const decodeAudioData = vi.fn(async () => ({ duration: 0.2 }) as AudioBuffer)
  class FakeContext {
    state: AudioContextState = 'suspended'
    destination = {}
    resume = resume
    decodeAudioData = decodeAudioData
    createBufferSource(): FakeSource {
      const source: FakeSource = { buffer: null, connect: vi.fn(), start: vi.fn() }
      sources.push(source)
      return source
    }
  }
  const play = vi.fn(() => Promise.resolve())
  class FakeAudio {
    src: string
    play = play
    constructor(src: string) {
      this.src = src
    }
  }
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })),
  )
  return { sources, play, resume, decodeAudioData }
}

async function loadExamSound() {
  vi.resetModules()
  return import('./examSound')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('examSound', () => {
  it('plays a decoded buffer without creating an audio element', async () => {
    const audio = installAudio()
    const { warmExamSounds, unlockExamSounds, playExamSound } = await loadExamSound()
    warmExamSounds(['/correct.mp3'])
    unlockExamSounds()
    await vi.waitFor(() => expect(audio.decodeAudioData).toHaveBeenCalled())
    await audio.decodeAudioData.mock.results[0]?.value
    await Promise.resolve()
    playExamSound('/correct.mp3')
    expect(audio.sources).toHaveLength(1)
    expect(audio.sources[0]?.start).toHaveBeenCalledWith(0)
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('uses an audio element when the buffer is not ready', async () => {
    const audio = installAudio()
    const { playExamSound } = await loadExamSound()
    playExamSound('/correct.mp3')
    expect(audio.play).toHaveBeenCalledOnce()
    expect(audio.sources).toHaveLength(0)
  })

  it('resumes a suspended context from the exam tap', async () => {
    const audio = installAudio()
    const { unlockExamSounds } = await loadExamSound()
    unlockExamSounds()
    expect(audio.resume).toHaveBeenCalledOnce()
  })
})
