import type { Word, WordsManifest } from '@/types/word'

const DEFAULT_BASE = `${import.meta.env.BASE_URL}data/words`

interface LessonWord {
  cn: string
  jp: string
  jp_write?: string
  describe?: string | null
  part_of_speech?: string
}

interface WordLocation {
  bookId: string
  unit: number
  lesson: number
}

/**
 * 把课次 JSON 收成 words 对象。
 * 书籍以清单为准写入。单元号用单元对象的 unit，课号用课对象的 lesson，都不用 id。describe 缺省或 null 时记为空字符串，并丢掉已废弃的 index。
 *
 * @param raw 课次文件里的一条词
 * @param location 该课在清单中的书籍、单元和课号
 * @return 可供练习和单词本使用的 words 对象
 */
function toWord(raw: LessonWord, location: WordLocation): Word {
  return {
    cn: raw.cn,
    jp: raw.jp,
    jp_write: raw.jp_write ?? '',
    describe: typeof raw.describe === 'string' ? raw.describe : '',
    part_of_speech: raw.part_of_speech ?? '',
    bookId: location.bookId,
    unit: location.unit,
    lesson: location.lesson,
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
  for (const book of manifest.books) {
    for (const unit of book.units) {
      for (const lesson of unit.lessons) {
        tasks.push(
          fetch(`${baseUrl}/${lesson.file}`).then(async (res) => {
            if (!res.ok) {
              throw new Error(`Failed to load ${lesson.file}: ${res.status}`)
            }
            const raw = (await res.json()) as LessonWord[]
            return raw.map((word) =>
              toWord(word, { bookId: book.id, unit: unit.unit, lesson: lesson.lesson }),
            )
          }),
        )
      }
    }
  }

  const chunks = await Promise.all(tasks)
  return { manifest, words: chunks.flat() }
}
