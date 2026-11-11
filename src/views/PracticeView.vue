<script setup lang="ts">
import { computed } from 'vue'
import LessonFilter from '@/components/LessonFilter.vue'
import PracticeTable from '@/components/PracticeTable.vue'
import { useWordsStore } from '@/stores/words'
import { PRACTICE_DESCRIPTION } from '@/utils/seo'

const wordsStore = useWordsStore()

const cardTitle = computed(() => (wordsStore.mode === 'cn2jp' ? '看中文写日语' : '看日语写中文'))

const modeModel = computed({
  get: () => wordsStore.mode,
  set: (value: 'cn2jp' | 'jp2cn') => wordsStore.setMode(value),
})

const accuracy = computed(() => {
  const total = wordsStore.answerTotal
  if (total === 0) return 0
  return Math.round((wordsStore.correctCount / total) * 100)
})
</script>

<template>
  <div class="practice-view">
    <p class="page-lead">{{ PRACTICE_DESCRIPTION }}</p>
    <div class="mode-switch">
      <el-radio-group v-model="modeModel">
        <el-radio-button value="cn2jp">看中文写日语</el-radio-button>
        <el-radio-button value="jp2cn">看日语写中文</el-radio-button>
      </el-radio-group>
      <LessonFilter />
    </div>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ cardTitle }}</span>
          <el-button type="primary" @click="wordsStore.checkAnswers()">提交所有答案</el-button>
        </div>
      </template>

      <PracticeTable />

      <div v-if="wordsStore.answersChecked" class="new-test">
        <el-button type="primary" @click="wordsStore.startTest(16)">开始新测试</el-button>
      </div>
    </el-card>

    <el-card v-if="wordsStore.answersChecked" class="result-card">
      <template #header>
        <div class="result-header">
          <span>测试结果统计</span>
          <span>正确率: {{ accuracy }}%</span>
          <span>正确: {{ wordsStore.correctCount }} / 总数: {{ wordsStore.answerTotal }}</span>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.page-lead {
  margin: 0 0 16px;
  color: #57534e;
  font-size: 14px;
  line-height: 1.6;
}

.mode-switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
  margin-bottom: 20px;
}

.card-header,
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.result-header {
  justify-content: flex-start;
}

.new-test {
  margin-top: 20px;
  text-align: center;
}

.result-card {
  margin-top: 20px;
}

.result-card :deep(.el-card__body) {
  display: none;
  padding: 0;
}
</style>
