export interface VoiceOption {
  name: string
  lang: string
  voiceURI: string
}

/** 防止 Chrome 在 speak 前回收 Utterance */
let currentUtterance: SpeechSynthesisUtterance | null = null

function isJapaneseVoice(voice: Pick<SpeechSynthesisVoice, 'lang' | 'name'>): boolean {
  return (
    /^ja([-_]|$)/i.test(voice.lang) ||
    /japan|日本語|haruka|ayumi|ichiro|nanami|kyoko|otoya/i.test(voice.name)
  )
}

function toVoiceOption(voice: SpeechSynthesisVoice): VoiceOption {
  return {
    name: voice.name,
    lang: voice.lang,
    voiceURI: voice.voiceURI,
  }
}

function readVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices()
}

/**
 * 加载语音选项。优先返回日语；没有日语时返回全部，方便下拉可选。
 * 只返回普通对象，避免 SpeechSynthesisVoice 进入 Vue 响应式。
 */
export function loadVoices(): Promise<VoiceOption[]> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      const raw = readVoices()
      const japanese = raw.filter(isJapaneseVoice).map(toVoiceOption)
      resolve(japanese.length ? japanese : raw.map(toVoiceOption))
    }

    if (readVoices().length) {
      finish()
      return
    }

    const onChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged)
      finish()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChanged)
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged)
      finish()
    }, 1500)
  })
}

export function findVoiceByUri(voiceURI?: string | null): SpeechSynthesisVoice | null {
  if (!voiceURI) return null
  return readVoices().find((voice) => voice.voiceURI === voiceURI) ?? null
}

/**
 * 朗读日语。
 * - 有明确选中的 voiceURI 时才绑定 voice
 * - 否则只设 lang=ja-JP，让浏览器自行选引擎（可走在线日语 TTS）
 * - 绝不把中文 voice 强加给日语文本
 */
export function speakJapanese(text: string, voiceURI?: string | null) {
  if (!text) return

  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'ja-JP'

  const selected = findVoiceByUri(voiceURI)
  if (selected) {
    // 用户显式选择时尊重选择；未选择时不要用非日语 voice 顶替
    utter.voice = selected
  } else {
    const japanese = readVoices().find(isJapaneseVoice)
    if (japanese) utter.voice = japanese
  }

  currentUtterance = utter
  utter.onend = () => {
    if (currentUtterance === utter) currentUtterance = null
  }
  utter.onerror = () => {
    if (currentUtterance === utter) currentUtterance = null
  }

  // 不先 cancel，避免部分 Chromium 把紧随其后的 speak 吞掉
  window.speechSynthesis.speak(utter)
}
