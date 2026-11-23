let context: AudioContext | null = null
const bytes = new Map<string, Promise<ArrayBuffer | null>>()
const buffers = new Map<string, AudioBuffer>()
const decoding = new Set<string>()
const wanted = new Set<string>()

function ensureContext(): AudioContext | null {
  if (context) return context
  if (typeof AudioContext === 'undefined') return null
  context = new AudioContext()
  return context
}

/**
 * 提前取回提示音并解码进内存。
 * 手机上每次新建音频元素都要重新打开播放通道，点选后声音会晚一拍。
 *
 * @param sources 提示音地址
 */
export function warmExamSounds(sources: string[]): void {
  for (const src of sources) {
    wanted.add(src)
    if (!bytes.has(src)) {
      bytes.set(
        src,
        fetch(src)
          .then((response) => (response.ok ? response.arrayBuffer() : null))
          .catch(() => null),
      )
    }
  }
  void decodeWanted()
}

/**
 * 在打开考试的这一下唤醒音频通道。
 * 必须写在点击处理里同步调用，等组件挂载后再唤醒，手机不会认。
 */
export function unlockExamSounds(): void {
  const ctx = ensureContext()
  if (ctx?.state === 'suspended') void ctx.resume()
  void decodeWanted()
}

/** 播放已解码的提示音。还没准备好时用音频元素，避免这一下没有声音。 */
export function playExamSound(src: string): void {
  const ctx = ensureContext()
  const buffer = buffers.get(src)
  if (!ctx || !buffer) {
    warmExamSounds([src])
    const audio = new Audio(src)
    void audio.play().catch(() => {})
    return
  }
  if (ctx.state === 'suspended') void ctx.resume()
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)
}

async function decodeWanted(): Promise<void> {
  const ctx = context
  if (!ctx) return
  await Promise.all([...wanted].map((src) => decodeOne(ctx, src)))
}

async function decodeOne(ctx: AudioContext, src: string): Promise<void> {
  if (buffers.has(src) || decoding.has(src)) return
  const pending = bytes.get(src)
  if (!pending) return
  decoding.add(src)
  try {
    const data = await pending
    if (!data || buffers.has(src)) return
    buffers.set(src, await ctx.decodeAudioData(data.slice(0)))
  } catch {
    // 解码失败就留空，点选时改用音频元素
  } finally {
    decoding.delete(src)
  }
}
