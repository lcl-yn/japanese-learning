/** 课文音频在文档里的节点类型。 */
export const LESSON_AUDIO_TYPE = 'lessonAudio'

/** 课文音频相对站点根的目录。文档里再接册 id 和文件名。 */
export const LESSON_AUDIO_PREFIX = '/data/audio/'

const AUDIO_FILE_NAME = /^[^/\\%]+\.(m4a|mp3|wav|ogg)$/i
const AUDIO_BOOK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_BOOK_ID_LENGTH = 64

const KIND_RANK = ['基本课文', '应用课文', '课后练习'] as const

/**
 * 文件名能不能当作课文音频。
 * 只要一个文件名，不接受路径、`..` 和百分号编码。
 *
 * @param name 目录里的文件名
 * @return 是允许的音频文件时为 true
 */
export function isLessonAudioFileName(name: string): boolean {
  return !name.includes('..') && AUDIO_FILE_NAME.test(name)
}

/**
 * 册代号能不能出现在音频目录名里。
 * 与课文路径一样，只允许小写字母、数字和连字符。
 *
 * @param bookId 册 id
 * @return 可以当作音频子目录时为 true
 */
export function isLessonAudioBookId(bookId: string): boolean {
  return bookId.length > 0 && bookId.length <= MAX_BOOK_ID_LENGTH && AUDIO_BOOK_ID.test(bookId)
}

/**
 * 文档里的地址是不是本地课文音频。
 * 只接受 `/data/audio/册id/文件名`，外链、缺册目录和再往下的路径都不算。
 *
 * @param value 节点上的 src
 * @return 可以写入课文时为 true
 */
export function isLessonAudioSrc(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith(LESSON_AUDIO_PREFIX)) return false
  const rest = value.slice(LESSON_AUDIO_PREFIX.length)
  const slash = rest.indexOf('/')
  if (slash <= 0 || rest.includes('/', slash + 1) || rest.includes('\\')) return false
  return isLessonAudioBookId(rest.slice(0, slash)) && isLessonAudioFileName(rest.slice(slash + 1))
}

/**
 * 用册和文件名拼出文档里保存的地址。
 *
 * @param bookId 册 id
 * @param fileName 该册目录里的文件名
 * @return 如 /data/audio/beginner-upper/第4课基本课文.m4a
 */
export function lessonAudioSrc(bookId: string, fileName: string): string {
  return `${LESSON_AUDIO_PREFIX}${bookId}/${fileName}`
}

/**
 * 播放条上显示的名字，去掉目录和后缀。
 *
 * @param src 文档里的音频地址
 * @return 如 第4课基本课文
 */
export function lessonAudioLabel(src: string): string {
  const name = src.startsWith(LESSON_AUDIO_PREFIX) ? src.slice(LESSON_AUDIO_PREFIX.length) : src
  const fileName = name.split('/').pop() ?? name
  return fileName.replace(/\.(m4a|mp3|wav|ogg)$/i, '')
}

/**
 * 浏览器实际请求的地址。中文文件名会编码，站点前缀留在路径前面。
 *
 * @param src 文档里的音频地址
 * @param baseUrl 站点公共前缀
 * @return 能交给 audio 元素的地址；src 不合法时为空字符串
 */
export function lessonAudioUrl(src: string, baseUrl = '/'): string {
  if (!isLessonAudioSrc(src)) return ''
  const prefix = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return encodeURI(`${prefix}${src}`)
}

/**
 * 课文音频的排列。
 * 先按课号，同一课按基本课文、应用课文、课后练习，对不上的按文件名排在后面。
 *
 * @param left 文件名
 * @param right 文件名
 * @return 排序比较结果
 */
export function compareLessonAudio(left: string, right: string): number {
  const a = lessonAudioRank(left)
  const b = lessonAudioRank(right)
  if (a.lesson !== b.lesson) return compareOptionalNumber(a.lesson, b.lesson)
  if (a.kind !== b.kind) return compareOptionalNumber(a.kind, b.kind)
  return left.localeCompare(right, 'zh')
}

/**
 * 目录扫描后留下音频文件，并按课号排好。
 *
 * @param names 目录中的名字
 * @return 排好序的音频文件名
 */
export function listLessonAudioNames(names: readonly string[]): string[] {
  return names.filter(isLessonAudioFileName).sort(compareLessonAudio)
}

export interface LessonAudioBookFiles {
  bookId: string
  fileNames: readonly string[]
}

/**
 * 把各册目录收成「册/文件名」，并按课号排好。
 *
 * @param books 每个册目录里的文件名
 * @return 如 beginner-upper/第4课基本课文.m4a
 */
export function listLessonAudioPaths(books: readonly LessonAudioBookFiles[]): string[] {
  const paths: string[] = []
  for (const book of books) {
    if (!isLessonAudioBookId(book.bookId)) continue
    for (const fileName of book.fileNames) {
      if (isLessonAudioFileName(fileName)) paths.push(`${book.bookId}/${fileName}`)
    }
  }
  return paths.sort(compareLessonAudio)
}

/**
 * 取出某一册的音频文件名。
 *
 * @param paths 册/文件名
 * @param bookId 当前册；没有册时为空列表
 * @return 这一册的文件名
 */
export function lessonAudioNamesForBook(paths: readonly string[], bookId: string | null): string[] {
  if (!bookId || !isLessonAudioBookId(bookId)) return []
  const prefix = `${bookId}/`
  const names = paths.flatMap((path) => {
    if (!path.startsWith(prefix)) return []
    const fileName = path.slice(prefix.length)
    return isLessonAudioFileName(fileName) ? [fileName] : []
  })
  return listLessonAudioNames(names)
}

/**
 * 当前课的音频排在列表前面，其余仍按课号排列。
 *
 * @param names 音频文件名
 * @param lesson 当前课号；没有课号时只按课号排
 * @return 给选择列表用的顺序
 */
export function orderLessonAudioForLesson(names: readonly string[], lesson: number | null): string[] {
  const sorted = [...names].sort(compareLessonAudio)
  if (lesson === null || !Number.isInteger(lesson) || lesson < 1) return sorted
  const prefix = `第${lesson}课`
  return [...sorted.filter((name) => name.startsWith(prefix)), ...sorted.filter((name) => !name.startsWith(prefix))]
}

/** 页面上正在占用播放的那一条。 */
export interface LessonAudioHandle {
  pause: () => void
  /** 取消这一条还没开始的下一遍。 */
  cancelReplay?: () => void
}

let playing: LessonAudioHandle | null = null

/**
 * 开始播这一条时停掉正在播的另一条。
 * 另一条如果还在等循环的下一遍，一并取消。
 *
 * @param audio 即将播放的音频
 */
export function claimLessonAudio(audio: LessonAudioHandle): void {
  if (playing && playing !== audio) {
    playing.cancelReplay?.()
    playing.pause()
  }
  playing = audio
}

/**
 * 这一条离开页面时放开占用，避免之后的播放去停一个已经不在的元素。
 *
 * @param audio 正在占用播放的那一条
 */
export function releaseLessonAudio(audio: LessonAudioHandle): void {
  if (playing === audio) playing = null
}

function lessonAudioRank(name: string): { lesson: number | null; kind: number | null } {
  const matched = /第(\d+)课/.exec(name)
  const lesson = matched ? Number(matched[1]) : null
  const kindIndex = KIND_RANK.findIndex((kind) => name.includes(kind))
  return { lesson, kind: kindIndex < 0 ? null : kindIndex }
}

function compareOptionalNumber(left: number | null, right: number | null): number {
  if (left === right) return 0
  if (left === null) return 1
  if (right === null) return -1
  return left - right
}
