<script setup lang="ts">
import type { GrammarOutlineItem } from '@/utils/grammarOutline'

defineProps<{
  items: GrammarOutlineItem[]
  activeIndex: number | null
}>()

const emit = defineEmits<{
  select: [index: number]
}>()
</script>

<template>
  <ul class="outline-list">
    <li v-for="item in items" :key="item.index">
      <button
        type="button"
        class="outline-link"
        :class="{ 'is-active': item.index === activeIndex }"
        :title="item.text"
        @click="emit('select', item.index)"
      >
        {{ item.text }}
      </button>
      <GrammarOutline
        v-if="item.children.length"
        :items="item.children"
        :active-index="activeIndex"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.outline-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.outline-list .outline-list {
  margin-left: 8px;
  padding-left: 10px;
  border-left: 1px solid #e4ddd2;
}

.outline-link {
  display: block;
  width: 100%;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #1c1917;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.outline-link:hover,
.outline-link.is-active {
  background: #f7eeeb;
  color: #9f3d2f;
}

.outline-link:focus-visible {
  outline: 2px solid #9f3d2f;
  outline-offset: 2px;
}
</style>
