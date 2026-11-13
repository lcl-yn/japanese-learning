<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  claimLessonAudio,
  lessonAudioLabel,
  lessonAudioUrl,
  releaseLessonAudio,
  type LessonAudioHandle,
} from '@/utils/lessonAudio'

const PLAY_ONCE = 'once'
const PLAY_LOOP = 'loop'
/** 循环时，一遍播完到下一遍开始的间隔 */
const LOOP_GAP_MS = 1000

const props = defineProps(nodeViewProps)

const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const playMode = ref<typeof PLAY_ONCE | typeof PLAY_LOOP>(PLAY_ONCE)
const current = ref(0)
const duration = ref(0)
let replayToken = 0
let replayTimer = 0

const src = computed(() => {
  const value = props.node.attrs.src
  return typeof value === 'string' ? value : ''
})
const label = computed(() => lessonAudioLabel(src.value))
const url = computed(() => lessonAudioUrl(src.value, import.meta.env.BASE_URL))
const durationReady = computed(() => duration.value > 0)

watch(src, () => {
  clearReplay()
  playing.value = false
  current.value = 0
  duration.value = 0
})

watch(playMode, (mode) => {
  if (mode === PLAY_LOOP || !replayTimer) return
  clearReplay()
  playing.value = false
})

onBeforeUnmount(() => {
  clearReplay()
  releaseLessonAudio(playback)
  audio.value?.pause()
})

/** 取消还没开始的下一遍。 */
function clearReplay(): void {
  replayToken += 1
  window.clearTimeout(replayTimer)
  replayTimer = 0
}

const playback: LessonAudioHandle = {
  pause() {
    audio.value?.pause()
  },
  cancelReplay() {
    if (!replayTimer) return
    clearReplay()
    playing.value = false
  },
}

/** 播放或暂停这一条。开始播放时停掉页面上的另一条；循环的间隔里再点一次就取消下一遍。 */
async function toggle(): Promise<void> {
  const element = audio.value
  if (!element) return
  if (replayTimer) {
    clearReplay()
    playing.value = false
    return
  }
  if (!element.paused) {
    element.pause()
    return
  }
  claimLessonAudio(playback)
  try {
    await element.play()
  } catch {
    playing.value = false
  }
}

/**
 * 循环时，这一遍结束后隔 1 秒再从头播放。
 * 间隔里按钮仍显示暂停，方便取消下一遍。
 */
function onEnded(): void {
  if (playMode.value !== PLAY_LOOP) {
    playing.value = false
    return
  }
  playing.value = true
  const token = ++replayToken
  window.clearTimeout(replayTimer)
  replayTimer = window.setTimeout(() => {
    replayTimer = 0
    void replay(token)
  }, LOOP_GAP_MS)
}

/** 从开头再播一遍。模式已改成一次，或这一条已被别的播放打断时不再播。 */
async function replay(token: number): Promise<void> {
  const element = audio.value
  if (token !== replayToken || !element || playMode.value !== PLAY_LOOP) {
    if (token === replayToken) playing.value = false
    return
  }
  claimLessonAudio(playback)
  if (token !== replayToken) return
  element.currentTime = 0
  current.value = 0
  try {
    await element.play()
  } catch {
    if (token === replayToken) playing.value = false
  }
}

/** 自然播完时有的浏览器也会派发 pause。循环还要等下一遍，这时不要把按钮改回播放。 */
function onPause(): void {
  const element = audio.value
  if (element?.ended && playMode.value === PLAY_LOOP) return
  playing.value = false
  if (replayTimer) clearReplay()
}

/** 把进度拖到指定时间。 */
function seek(event: Event): void {
  const element = audio.value
  const input = event.target
  if (!element || !(input instanceof HTMLInputElement)) return
  const next = Number(input.value)
  if (!Number.isFinite(next)) return
  if (replayTimer) {
    clearReplay()
    playing.value = false
  }
  element.currentTime = next
  current.value = next
}

function rememberTime(): void {
  const element = audio.value
  if (!element) return
  current.value = element.currentTime
}

function rememberDuration(): void {
  const element = audio.value
  const next = element?.duration
  duration.value = typeof next === 'number' && Number.isFinite(next) ? next : 0
}

/** 进度时间显示成分和秒。 */
function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
</script>

<template>
  <NodeViewWrapper class="lesson-audio" :data-lesson-audio="src">
    <div class="lesson-audio-card" :class="{ 'is-selected': selected }">
      <div class="lesson-audio-row">
        <button type="button" class="lesson-audio-play" :aria-label="playing ? '暂停' : '播放'" @mousedown.prevent @click="toggle">
          {{ playing ? '暂停' : '播放' }}
        </button>
        <el-select v-model="playMode" class="lesson-audio-mode" aria-label="播放模式">
          <el-option label="一次" :value="PLAY_ONCE" />
          <el-option label="循环" :value="PLAY_LOOP" />
        </el-select>
        <span class="lesson-audio-name">{{ label }}</span>
        <span class="lesson-audio-time">{{ formatAudioTime(current) }} / {{ formatAudioTime(duration) }}</span>
      </div>
      <input
        class="lesson-audio-range"
        type="range"
        min="0"
        :max="durationReady ? duration : 0"
        step="0.1"
        :value="current"
        :disabled="!durationReady"
        aria-label="播放进度"
        @input="seek"
      />
      <audio
        ref="audio"
        :src="url"
        preload="metadata"
        @play="playing = true"
        @pause="onPause"
        @ended="onEnded"
        @timeupdate="rememberTime"
        @loadedmetadata="rememberDuration"
        @durationchange="rememberDuration"
      />
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.lesson-audio-card {
  margin: 0.6em 0;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e4ddd2;
  border-radius: 8px;
}

.lesson-audio-card.is-selected {
  border-color: #9f3d2f;
}

.lesson-audio-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lesson-audio-play {
  flex: none;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e4ddd2;
  border-radius: 6px;
  background: #fbf8f3;
  color: #1c1917;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.lesson-audio-play:hover {
  border-color: #9f3d2f;
  background: #f7eeeb;
}

.lesson-audio-mode {
  flex: none;
  width: 88px;
}

.lesson-audio-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #1c1917;
  font-size: 14px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lesson-audio-time {
  flex: none;
  color: #57534e;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.lesson-audio-range {
  width: 100%;
  margin: 8px 0 0;
  accent-color: #9f3d2f;
}

audio {
  display: none;
}
</style>
