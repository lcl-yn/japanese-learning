<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { phoneLayout } from '@/utils/phoneLayout'
import { loadVoices, restartJapanese, speakJapanese, stopSpeaking, type VoiceOption } from '@/utils/speech'

/** 拖到视口边缘时留出的空隙 */
const EDGE_GAP = 8

/** 手机收起气泡的边长，和样式里的宽高一致 */
const LAUNCHER_SIZE = 44

/** 按住气泡时，位移超过这个像素才算拖动，不算点开 */
const DRAG_THRESHOLD = 8

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
const launcherEl = ref<HTMLButtonElement | null>(null)
const placed = ref(false)
const x = ref(0)
const y = ref(0)
const dragging = ref(false)
const speakerOpen = ref(false)
/** 点过之后先去掉悬停色。手机上松手后悬停会粘住，所以要一直留到指针再次进来。 */
const speakSettled = ref(false)
/** 手指或按键按住小喇叭时为真，松手立刻收回，避免手机上按下色粘住 */
const speakHolding = ref(false)
const showBar = computed(() => !phoneLayout.value || speakerOpen.value)
const showLauncher = computed(() => phoneLayout.value && !speakerOpen.value)

const barStyle = computed(() => {
  if (!placed.value) return undefined
  return { left: `${x.value}px`, top: `${y.value}px` }
})

const launcherStyle = computed(() => {
  if (!placed.value) return undefined
  return { left: `${x.value}px`, top: `${y.value}px` }
})

let dragOffsetX = 0
let dragOffsetY = 0
let dragWidth = 0
let dragHeight = 0
let launcherPointerId: number | null = null
let launcherStartX = 0
let launcherStartY = 0
let launcherMoved = false
let loopToken = 0
let loopTimer = 0

/**
 * 把朗读条或气泡限制在视口内。
 * 比安全区还宽或还高时改为居中，避免贴边后左右来回弹。
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

/** 收起时把气泡停在当前朗读条这一行的右侧。 */
function parkLauncherAtBarRight() {
  const rect = formEl.value?.getBoundingClientRect()
  dragWidth = LAUNCHER_SIZE
  dragHeight = LAUNCHER_SIZE
  const top = rect ? rect.top : y.value
  applyPosition(window.innerWidth - EDGE_GAP - LAUNCHER_SIZE, top)
}

/** 从气泡打开时，朗读条跟气泡同一高度，水平居中。 */
async function openSpeaker() {
  speakerOpen.value = true
  await nextTick()
  if (!placed.value || !formEl.value) return
  const rect = formEl.value.getBoundingClientRect()
  dragWidth = rect.width
  dragHeight = rect.height
  applyPosition((window.innerWidth - rect.width) / 2, y.value)
}

function collapseSpeaker() {
  parkLauncherAtBarRight()
  speakerOpen.value = false
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

/** 按住气泡开始拖；位移够大才算移动，松手几乎没动则打开朗读条。 */
function onLauncherPointerDown(event: PointerEvent) {
  if (!launcherEl.value || event.button !== 0) return
  const rect = launcherEl.value.getBoundingClientRect()
  dragOffsetX = event.clientX - rect.left
  dragOffsetY = event.clientY - rect.top
  dragWidth = rect.width
  dragHeight = rect.height
  launcherPointerId = event.pointerId
  launcherStartX = event.clientX
  launcherStartY = event.clientY
  launcherMoved = false
  dragging.value = true
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onLauncherPointerMove)
  window.addEventListener('pointerup', onLauncherPointerUp)
  window.addEventListener('pointercancel', onLauncherPointerUp)
  event.preventDefault()
}

function onLauncherPointerMove(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== launcherPointerId) return
  const dx = event.clientX - launcherStartX
  const dy = event.clientY - launcherStartY
  if (!launcherMoved && dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
  launcherMoved = true
  applyPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY)
}

function onLauncherPointerUp(event: PointerEvent) {
  if (launcherPointerId !== null && event.pointerId !== launcherPointerId) return
  const moved = launcherMoved
  dragging.value = false
  launcherPointerId = null
  window.removeEventListener('pointermove', onLauncherPointerMove)
  window.removeEventListener('pointerup', onLauncherPointerUp)
  window.removeEventListener('pointercancel', onLauncherPointerUp)
  if (!moved) void openSpeaker()
}

function syncSpeakerLayout() {
  document.documentElement.dataset.speaker = phoneLayout.value && speakerOpen.value ? 'open' : ''
}

function onResize() {
  if (!placed.value) return
  if (speakerOpen.value && formEl.value) {
    const rect = formEl.value.getBoundingClientRect()
    dragWidth = rect.width
    dragHeight = rect.height
    applyPosition(x.value, y.value)
    return
  }
  dragWidth = LAUNCHER_SIZE
  dragHeight = LAUNCHER_SIZE
  applyPosition(window.innerWidth - EDGE_GAP - LAUNCHER_SIZE, y.value)
}

watch([phoneLayout, speakerOpen], syncSpeakerLayout)

onMounted(async () => {
  syncSpeakerLayout()
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
  delete document.documentElement.dataset.speaker
  window.removeEventListener('resize', onResize)
  onDragEnd()
  window.removeEventListener('pointermove', onLauncherPointerMove)
  window.removeEventListener('pointerup', onLauncherPointerUp)
  window.removeEventListener('pointercancel', onLauncherPointerUp)
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

/** 按住时立刻铺上深红色，并把后续松手事件留在这个按钮上。 */
function onSpeakPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  speakHolding.value = true
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.setPointerCapture(event.pointerId)
}

/** 松手后收回按下色和悬停色，并去掉点击留下的焦点框。 */
function onSpeakPointerUp(event: PointerEvent) {
  speakHolding.value = false
  speakSettled.value = true
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.blur()
}

/** 键盘按住空格或回车时，和小喇叭按下同一套深红色。 */
function onSpeakKeyDown(event: KeyboardEvent) {
  if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return
  speakHolding.value = true
}

function onSpeakKeyUp(event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return
  speakHolding.value = false
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
  <button
    v-show="showLauncher"
    ref="launcherEl"
    type="button"
    class="speaker-launcher"
    :class="{ 'is-placed': placed, 'is-dragging': dragging }"
    :style="launcherStyle"
    aria-label="打开朗读"
    @pointerdown="onLauncherPointerDown"
  >
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5v8A2.5 2.5 0 0 1 16.5 15H11l-4.2 3.6a.7.7 0 0 1-1.1-.5V15H7.5A2.5 2.5 0 0 1 5 12.5v-8z"
      />
    </svg>
  </button>
  <form
    v-show="showBar"
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
      :class="{ 'is-pressed': looping, 'is-holding': speakHolding, 'is-settled': speakSettled }"
      :aria-pressed="looping"
      :aria-label="looping ? '停止复读' : '朗读'"
      @pointerover="speakSettled = false"
      @pointerdown="onSpeakPointerDown"
      @pointerup="onSpeakPointerUp"
      @pointercancel="onSpeakPointerUp"
      @keydown="onSpeakKeyDown"
      @keyup="onSpeakKeyUp"
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
    <button v-if="phoneLayout" type="button" class="speaker-collapse" aria-label="收起朗读" @click="collapseSpeaker">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5v8A2.5 2.5 0 0 1 16.5 15H11l-4.2 3.6a.7.7 0 0 1-1.1-.5V15H7.5A2.5 2.5 0 0 1 5 12.5v-8z"
        />
      </svg>
    </button>
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

/* 手机浏览器聚焦字号小于 16px 的输入框会放大整页。下拉内部的输入框也要到 16px。 */
.jp-input :deep(.el-input__wrapper),
.jp-input :deep(.el-input__inner),
.mode-select :deep(.el-select__wrapper),
.mode-select :deep(.el-select__input),
.voice-select :deep(.el-select__wrapper),
.voice-select :deep(.el-select__input) {
  font-size: 16px;
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

@media (hover: hover) and (pointer: fine) {
  .speak:hover {
    background: #f3e4df;
    border-color: #9f3d2f;
    color: #7f3126;
  }
}

.speak.is-settled,
.speak.is-settled:hover {
  background: #fbf8f3;
  border-color: #e4ddd2;
  color: #9f3d2f;
  transform: none;
  box-shadow: none;
}

.speak.is-holding,
.speak.is-holding:hover,
.speak.is-settled.is-holding,
.speak.is-pressed,
.speak.is-pressed:hover,
.speak.is-settled.is-pressed {
  background: #9f3d2f;
  border-color: #7f3126;
  color: #fbf8f3;
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(28, 25, 23, 0.28);
  transition: none;
}

.speak:focus-visible,
.speaker-launcher:focus-visible,
.speaker-collapse:focus-visible {
  outline: 2px solid #9f3d2f;
  outline-offset: 2px;
}

.speaker-launcher,
.speaker-collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e4ddd2;
  background: #fbf8f3;
  color: #9f3d2f;
  cursor: pointer;
}

.speaker-launcher {
  position: fixed;
  z-index: 31;
  right: 16px;
  bottom: 12px;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(28, 25, 23, 0.12);
  touch-action: none;
  cursor: grab;
}

.speaker-launcher.is-placed {
  right: auto;
  bottom: auto;
}

.speaker-launcher.is-dragging {
  cursor: grabbing;
}

.speaker-collapse {
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
}

.mode-select {
  flex: none;
  width: 88px;
}

.voice-select {
  flex: none;
  width: 200px;
}

html[data-layout='phone'] .jp-speaker {
  flex-wrap: wrap;
  width: min(760px, calc(100% - 24px));
}

/* 未拖动时贴底；拖动后只留 top，避免和 bottom 一起把条纵向拉高 */
html[data-layout='phone'] .jp-speaker:not(.is-placed) {
  bottom: 12px;
}

html[data-layout='phone'] .jp-input {
  flex: 1 0 100%;
  order: -1;
}

html[data-layout='phone'] .voice-select {
  flex: 1;
  width: auto;
  min-width: 0;
}
</style>
