import type { Word, WordsManifest } from '@/types/word'

const DEFAULT_BASE = `${import.meta.env.BASE_URL}data/words`

interface LessonWord {
  cn: string
  jp: string
  jp_write?: string
  describe?: string | null
  part_of_speech?: string
  lesson: number
}

/**
 * 把课次 JSON 收成 words 对象。
 * 补上课程编号，describe 缺省或 null 时记为空字符串，并丢掉已废弃的 index。
 *
 * @param raw 课次文件里的一条词
 * @param courseId 所属课程编号
 * @return 可供练习和单词本使用的 words 对象
 */
function toWord(raw: LessonWord, courseId: string): Word {
  return {
    cn: raw.cn,
    jp: raw.jp,
    jp_write: raw.jp_write ?? '',
    describe: typeof raw.describe === 'string' ? raw.describe : '',
    part_of_speech: raw.part_of_speech ?? '',
    lesson: raw.lesson,
    courseId,
  }
}

export async function loadAllWords(baseUrl = DEFAULT_BASE): Promise<{
  manifest: WordsManifest
  words: Word[]
}> {
  const manifestRes = await fetch(`${baseUrl}/manifest.json`)
  if (!manifestRes.ok) {
    throw new Error(`Failed to load manifest: ${manifestRes.status}`)
  }
  const manifest = (await manifestRes.json()) as WordsManifest

  const tasks: Promise<Word[]>[] = []
  for (const course of manifest.courses) {
    for (const lesson of course.lessons) {
      tasks.push(
        fetch(`${baseUrl}/${lesson.file}`).then(async (res) => {
          if (!res.ok) {
            throw new Error(`Failed to load ${lesson.file}: ${res.status}`)
          }
          const raw = (await res.json()) as LessonWord[]
          return raw.map((word) => toWord(word, course.id))
        }),
      )
    }
  }

  const chunks = await Promise.all(tasks)
  return { manifest, words: chunks.flat() }
}
