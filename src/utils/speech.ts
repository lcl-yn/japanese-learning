export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) {
      resolve(voices)
      return
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices())
    }
  })
}

export function speakJapanese(text: string, voice?: SpeechSynthesisVoice | null) {
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'ja-JP'
  if (voice) utter.voice = voice
  else {
    const ja = window.speechSynthesis.getVoices().find((v) => v.lang === 'ja-JP')
    if (ja) utter.voice = ja
  }
  window.speechSynthesis.speak(utter)
}
