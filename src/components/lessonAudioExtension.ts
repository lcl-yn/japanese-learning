import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import LessonAudioPlayer from '@/components/LessonAudioPlayer.vue'
import { LESSON_AUDIO_TYPE } from '@/utils/lessonAudio'

/**
 * 课文里的音频块。地址写在 src 上，阅读和编辑都用同一条播放条。
 */
export const lessonAudioExtension = Node.create({
  name: LESSON_AUDIO_TYPE,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-src') ?? '',
        renderHTML: (attributes) => {
          const src = attributes.src
          if (typeof src !== 'string' || src === '') return {}
          return { 'data-src': src }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-lesson-audio]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-lesson-audio': '' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(LessonAudioPlayer, {
      stopEvent: ({ event }) => {
        const target = event.target
        return target instanceof Element && Boolean(target.closest('button, input'))
      },
    })
  },
})
