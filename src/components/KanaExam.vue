<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Word } from '@/types/word'
import { buildChineseChoices, writingMatchesKana, type ExamChoice } from '@/utils/examChoices'
import { drawExamItem, type ExamRound } from '@/utils/examQueue'
import { playExamSound, warmExamSounds } from '@/utils/examSound'
import { buildKanaChoices } from '@/utils/kanaConfusion'
import correctSound from '../../docs/Music/button-correct.mp3'
import wrongSound from '../../docs/Music/button-wrong.mp3'

warmExamSounds([correctSound, wrongSound])

const props = defineProps<{
  words: Word[]
  /** 整本词库。手写与假名相同时，错误中文从这里随机抽。 */
  lexicon: Word[]
}>()

const emit = defineEmits<{
  miss: [word: Word]
  /** 这一轮已经答过的题数。范围一变或重新洗牌就从 0 计。 */
  progress: [done: number]
}>()

const prompt = ref('')
const options = ref<ExamChoice[]>([])
const choiceKind = ref<'kana' | 'cn'>('kana')
const picked = ref<number | null>(null)
const current = ref<Word | null>(null)
const answered = ref(0)
let round: ExamRound = { pending: [], lastKey: '' }

function wordKey(word: Word) {
  return `${word.bookId}:${word.unit}:${word.lesson}:${word.fileIndex ?? ''}:${word.jp}:${word.cn}`
}

/** 从当前范围抽下一题。这一轮没出过的优先，出完才重新洗牌。 */
function deal() {
  picked.value = null
  const pool = props.words.filter((word) => word.jp.trim())
  const drawn = drawExamItem(pool, round, wordKey, (word) => prepareChoices(word))
  round = drawn.round
  if (drawn.restarted) answered.value = 0
  emit('progress', answered.value)
  current.value = drawn.item
  if (!drawn.item || !drawn.prepared) {
    prompt.value = ''
    options.value = []
    return
  }
  const write = drawn.item.jp_write.trim()
  prompt.value = write || drawn.item.jp.trim()
  choiceKind.value = writingMatchesKana(drawn.item.jp, drawn.item.jp_write) ? 'cn' : 'kana'
  options.value = drawn.prepared
}

/** 手写与假名不同时选假名；相同时选中文，错误项来自整本词库。 */
function prepareChoices(word: Word): ExamChoice[] | null {
  if (writingMatchesKana(word.jp, word.jp_write)) {
    return buildChineseChoices(
      word.cn,
      props.lexicon.map((item) => item.cn),
    )
  }
  const choices = buildKanaChoices(word.jp)
  if (choices.length !== 4) return null
  return choices.map((choice) => ({ text: choice.kana, correct: choice.correct }))
}

function play(src: string) {
  playExamSound(src)
}

function choose(index: number) {
  if (picked.value !== null) return
  picked.value = index
  const correct = options.value[index]?.correct === true
  play(correct ? correctSound : wrongSound)
  answered.value += 1
  emit('progress', answered.value)
  if (!correct && current.value) emit('miss', current.value)
}

function tone(index: number) {
  if (picked.value === null) return ''
  if (options.value[index]?.correct) return 'is-correct'
  if (picked.value === index) return 'is-wrong'
  return ''
}

watch(() => props.words, deal, { immediate: true })
</script>

<template>
  <section class="exam" :aria-label="choiceKind === 'cn' ? '看日语选中文' : '看手写选假名'">
    <p v-if="options.length === 0" class="empty">这一范围没有可以出的单词。</p>
    <template v-else>
      <p class="write">{{ prompt }}</p>
      <div class="choices">
        <button
          v-for="(option, index) in options"
          :key="`${option.text}-${index}`"
          type="button"
          class="choice"
          :class="[tone(index), { 'is-cn': choiceKind === 'cn' }]"
          :disabled="picked !== null"
          @click="choose(index)"
        >
          {{ option.text }}
        </button>
      </div>
      <button v-if="picked !== null" type="button" class="continue" @click="deal">继续</button>
    </template>
  </section>
</template>

<style scoped>
.exam {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 28px 8px 12px;
}

.empty {
  margin: 0;
  color: #8a8478;
  text-align: center;
}

.write {
  margin: 0;
  color: #2c2824;
  font-size: 48px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}

.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.choice {
  min-height: 72px;
  padding: 12px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  color: #2c2824;
  font: inherit;
  font-size: 22px;
  overflow-wrap: anywhere;
  box-shadow: 0 4px 0 #e4ddd2;
  transition: transform 0.08s ease, background 0.15s ease, color 0.15s ease;
}

.choice.is-cn {
  font-size: 16px;
  line-height: 1.35;
}

.choice:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #e4ddd2;
}

.choice.is-correct {
  background: #2f6fed;
  color: #fff;
  box-shadow: 0 4px 0 #1d4ed8;
}

.choice.is-wrong {
  background: #e14b4b;
  color: #fff;
  box-shadow: 0 4px 0 #b42323;
}

.choice:disabled {
  cursor: default;
}

.continue {
  min-height: 52px;
  border: 0;
  border-radius: 16px;
  background: #f8882c;
  color: #fff;
  font: inherit;
  font-size: 18px;
  box-shadow: 0 4px 0 #d86c12;
}

.continue:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #d86c12;
}
</style>
