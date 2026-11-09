<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder: string
  checked: boolean
  correct: boolean
  expected: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="answer-field">
    <el-input
      :model-value="modelValue"
      :placeholder="placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div v-if="checked && correct" class="feedback correct">
      <span class="dot" aria-hidden="true"></span>
      <span>回答正确</span>
    </div>
    <div v-else-if="checked" class="feedback incorrect">
      <span class="dot" aria-hidden="true"></span>
      <span>正确答案：{{ expected }}</span>
    </div>
  </div>
</template>

<style scoped>
.answer-field {
  padding: 4px 0;
}

.feedback {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  flex: none;
}

.correct {
  color: #67c23a;
}

.correct .dot {
  background: #67c23a;
}

.incorrect {
  color: #f56c6c;
}

.incorrect .dot {
  background: #f56c6c;
}
</style>
