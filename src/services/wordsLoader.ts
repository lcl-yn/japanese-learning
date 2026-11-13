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
 * 书籍以清单的 code 写入 bookId。单元号用单元对象的 unit，课号用课对象的 lesson。describe 缺省或 null 时记为空字符串，并丢掉已废弃的 index。
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

/**
 * 读取一课的词条。
 * 文件不存在时这一课没有词。开发服务器对缺少的静态文件会回退成页面 HTML，同样视为没有词，避免把首页当成 JSON 解析。
 *
 * @param fileUrl 课次文件地址
 * @param file 清单里的相对路径，用于失败提示
 * @param location 该课在清单中的书籍、单元和课号
 * @return 这一课的词；文件缺失时为空数组
 */
async function loadLessonWords(fileUrl: string, file: string, location: WordLocation): Promise<Word[]> {
  const res = await fetch(fileUrl)
  if (res.status === 404) return []
  if (!res.ok) {
    throw new Error(`Failed to load ${file}: ${res.status}`)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return []
  const raw = (await res.json()) as LessonWord[]
  return raw.map((word) => toWord(word, location))
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
          loadLessonWords(`${baseUrl}/${lesson.file}`, lesson.file, {
            bookId: book.code,
            unit: unit.unit,
            lesson: lesson.lesson,
          }),
        )
      }
    }
  }

  const chunks = await Promise.all(tasks)
  return { manifest, words: chunks.flat() }
}
