<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadVoices, restartJapanese, speakJapanese, stopSpeaking, type VoiceOption } from '@/utils/speech'

/** 拖到视口边缘时留出的空隙 */
const EDGE_GAP = 8

const PLAY_ONCE = 'once'
const PLAY_LOOP = 'loop'
/** 循环时，一句读完到下一句开始的间隔 */
const LOOP_GAP_MS = 1000

/** 输入法正在处理按键，此时回车只确认候选 */
const IME_PROCESS_KEY = 229

const text = ref('')
const playMode = ref<typeof PLAY_ONCE | typeof PLAY_LOOP>(PLAY_ONCE)
const looping = ref(false)
const voiceOptions = ref<VoiceOption[]>([])
const selectedVoiceUri = ref('')
const hasJapaneseVoice = ref(false)
const formEl = ref<HTMLFormElement | null>(null)
const placed = ref(false)
const x = ref(0)
const y = ref(0)
const dragging = ref(false)

const barStyle = computed(() => {
  if (!placed.value) return undefined
  return { left: `${x.value}px`, top: `${y.value}px` }
})

let dragOffsetX = 0
let dragOffsetY = 0
let dragWidth = 0
let dragHeight = 0
let loopToken = 0
let loopTimer = 0

/**
 * 把朗读条限制在视口内。
 * 条比安全区还宽或还高时改为居中，避免贴边后左右来回弹。
 */
function clampToViewport(left: number, top: number, width: number, height: number) {
  const maxLeft = window.innerWidth - width - EDGE_GAP
  const maxTop = window.innerHeight - height - EDGE_GAP
  return {
    left: maxLeft < EDGE_GAP ? Math.max(0, (window.innerWidth - width) / 2) : Math.min(Math.max(left, EDGE_GAP), maxLeft),
    top: maxTop < EDGE_GAP ? Math.max(0, (window.innerHeight - height) / 2) : Math.min(Math.max(top, EDGE_GAP), maxTop),
  }
}

function applyPosition(left: number, top: number) {
  const next = clampToViewport(left, top, dragWidth, dragHeight)
  x.value = next.left
  y.value = next.top
  placed.value = true
}

function onDragStart(event: PointerEvent) {
  if (!formEl.value || event.button !== 0) return
  const rect = formEl.value.getBoundingClientRect()
  dragOffsetX = event.clientX - rect.left
  dragOffsetY = event.clientY - rect.top
  dragWidth = rect.width
  dragHeight = rect.height
  dragging.value = true
  applyPosition(rect.left, rect.top)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
  event.preventDefault()
}

function onDragMove(event: PointerEvent) {
  if (!dragging.value) return
  applyPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY)
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
}

function onResize() {
  if (!placed.value || !formEl.value) return
  const rect = formEl.value.getBoundingClientRect()
  dragWidth = rect.width
  dragHeight = rect.height
  applyPosition(x.value, y.value)
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  const voices = await loadVoices()
  voiceOptions.value = voices
  const japanese =
    voices.find((voice) => voice.name.includes('Microsoft Ichiro')) ??
    voices.find((voice) => /^ja([-_]|$)/i.test(voice.lang))
  hasJapaneseVoice.value = Boolean(japanese)
  selectedVoiceUri.value = japanese?.voiceURI ?? ''
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  onDragEnd()
  stopLoop()
})

watch(playMode, (mode) => {
  if (mode !== PLAY_LOOP && looping.value) stopLoop()
})

/** 停掉循环，并取消还没开始的下一遍。 */
function stopLoop() {
  loopToken += 1
  looping.value = false
  window.clearTimeout(loopTimer)
  stopSpeaking()
}

/**
 * 循环复读当前输入。
 * 一句自然读完后隔 1 秒再从头读。
 */
function startLoop() {
  const token = ++loopToken
  looping.value = true

  const run = (restart: boolean) => {
    if (token !== loopToken) return
    const spoken = text.value.trim()
    if (!spoken) {
      stopLoop()
      return
    }
    const hooks = {
      onend: () => {
        if (token !== loopToken) return
        window.clearTimeout(loopTimer)
        loopTimer = window.setTimeout(() => run(false), LOOP_GAP_MS)
      },
    }
    if (restart) restartJapanese(spoken, selectedVoiceUri.value, hooks)
    else speakJapanese(spoken, selectedVoiceUri.value, hooks)
  }

  run(true)
}

function onSpeak() {
  if (playMode.value === PLAY_LOOP) {
    if (looping.value) {
      stopLoop()
      return
    }
    if (!text.value.trim()) return
    startLoop()
    return
  }
  if (looping.value) stopLoop()
  restartJapanese(text.value, selectedVoiceUri.value)
}

/**
 * 输入框按回车，等同点一次小喇叭。
 * 输入法还在组字时只确认候选，不朗读。
 */
function onInputEnter(event: KeyboardEvent) {
  event.preventDefault()
  if (event.isComposing || event.key === 'Process' || event.keyCode === IME_PROCESS_KEY) return
  onSpeak()
}
</script>

<template>
  <form
    ref="formEl"
    class="jp-speaker"
    :class="{ 'is-placed': placed, 'is-dragging': dragging }"
    :style="barStyle"
    @submit.prevent="onSpeak"
  >
    <button
      type="button"
      class="drag"
      aria-label="拖动"
      @pointerdown="onDragStart"
    >
      <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
        <circle cx="2" cy="2" r="1.2" fill="currentColor" />
        <circle cx="8" cy="2" r="1.2" fill="currentColor" />
        <circle cx="2" cy="8" r="1.2" fill="currentColor" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        <circle cx="2" cy="14" r="1.2" fill="currentColor" />
        <circle cx="8" cy="14" r="1.2" fill="currentColor" />
      </svg>
    </button>
    <el-input
      v-model="text"
      class="jp-input"
      placeholder="输入日语"
      aria-label="日语"
      lang="ja"
      clearable
      @keydown.enter="onInputEnter"
    />
    <button
      type="submit"
      class="speak"
      :class="{ 'is-pressed': looping }"
      :aria-pressed="looping"
      :aria-label="looping ? '停止复读' : '朗读'"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a3.5 3.5 0 0 0-1.8-3.06v6.12A3.5 3.5 0 0 0 15.5 12zm-1.8-6.36v2.06a6 6 0 0 1 0 8.6v2.06a8 8 0 0 0 0-12.72z"
        />
      </svg>
    </button>
    <el-select v-model="playMode" class="mode-select" aria-label="播放模式">
      <el-option label="一次" :value="PLAY_ONCE" />
      <el-option label="循环" :value="PLAY_LOOP" />
    </el-select>
    <el-select
      v-model="selectedVoiceUri"
      class="voice-select"
      :placeholder="hasJapaneseVoice ? '音色' : '自动（日语）'"
      aria-label="音色"
      clearable
    >
      <el-option
        v-for="voice in voiceOptions"
        :key="voice.voiceURI"
        :label="`${voice.name} (${voice.lang})`"
        :value="voice.voiceURI"
      />
    </el-select>
  </form>
</template>

<style scoped>
.jp-speaker {
  position: fixed;
  z-index: 30;
  left: 50%;
  bottom: 64px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(760px, calc(100% - 32px));
  margin: 0;
  padding: 8px;
  background: #fbf8f3;
  border: 1px solid #e4ddd2;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(28, 25, 23, 0.12);
}

.jp-speaker.is-placed {
  bottom: auto;
  transform: none;
}

.jp-input {
  flex: 1;
  min-width: 0;
}

.drag {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #a8a29e;
  cursor: grab;
  touch-action: none;
}

.drag:hover {
  background: #f3e4df;
  color: #57534e;
}

.drag:focus-visible {
  outline: 2px solid #9f3d2f;
  outline-offset: 2px;
}

.jp-speaker.is-dragging .drag {
  cursor: grabbing;
}

.speak {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e4ddd2;
  border-radius: 8px;
  background: #fbf8f3;
  color: #9f3d2f;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}

.speak:hover {
  background: #f3e4df;
  border-color: #9f3d2f;
  color: #7f3126;
}

.speak:active,
.speak.is-pressed,
.speak.is-pressed:hover {
  background: #9f3d2f;
  border-color: #7f3126;
  color: #fbf8f3;
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(28, 25, 23, 0.28);
}

.speak:focus-visible {
  outline: 2px solid #9f3d2f;
  outline-offset: 2px;
}

.mode-select {
  flex: none;
  width: 88px;
}

.voice-select {
  flex: none;
  width: 200px;
}

@media (max-width: 959px) {
  .jp-speaker {
    width: min(760px, calc(100% - 24px));
  }

  .voice-select {
    width: 148px;
  }
}
</style>
