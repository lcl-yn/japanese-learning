<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { claimLessonAudio, lessonAudioLabel, lessonAudioUrl } from '@/utils/lessonAudio'

const props = defineProps(nodeViewProps)

const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const current = ref(0)
const duration = ref(0)

const src = computed(() => {
  const value = props.node.attrs.src
  return typeof value === 'string' ? value : ''
})
const label = computed(() => lessonAudioLabel(src.value))
const url = computed(() => lessonAudioUrl(src.value, import.meta.env.BASE_URL))
const durationReady = computed(() => duration.value > 0)

watch(src, () => {
  playing.value = false
  current.value = 0
  duration.value = 0
})

onBeforeUnmount(() => {
  audio.value?.pause()
})

/** 播放或暂停这一条。开始播放时停掉页面上的另一条。 */
async function toggle(): Promise<void> {
  const element = audio.value
  if (!element) return
  if (!element.paused) {
    element.pause()
    return
  }
  claimLessonAudio(element)
  try {
    await element.play()
  } catch {
    playing.value = false
  }
}

/** 把进度拖到指定时间。 */
function seek(event: Event): void {
  const element = audio.value
  const input = event.target
  if (!element || !(input instanceof HTMLInputElement)) return
  const next = Number(input.value)
  if (!Number.isFinite(next)) return
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
        @pause="playing = false"
        @ended="playing = false"
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
