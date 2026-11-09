import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync('legacy/js/japanese-chinese-learning.js', 'utf8')
const match = src.match(/const allWords = (\[[\s\S]*?\]);/)
if (!match) throw new Error('allWords not found')
const words = eval(match[1])

const valid = words.filter(
  (w) => w && w.lesson > 0 && typeof w.cn === 'string' && typeof w.jp === 'string' && w.cn && w.jp,
)

const byLesson = new Map()
for (const w of valid) {
  const list = byLesson.get(w.lesson) || []
  list.push({
    index: w.index,
    cn: w.cn,
    jp: w.jp,
    jp_kanji: w.jp_kanji ?? '',
    part_of_speech: w.part_of_speech ?? '',
    lesson: w.lesson,
  })
  byLesson.set(w.lesson, list)
}

const outDir = path.join('public', 'data', 'words', 'course-n5')
fs.mkdirSync(outDir, { recursive: true })

const lessons = []
for (const [lessonId, list] of [...byLesson.entries()].sort((a, b) => a[0] - b[0])) {
  const file = `course-n5/lesson-${String(lessonId).padStart(2, '0')}.json`
  fs.writeFileSync(
    path.join('public', 'data', 'words', file),
    JSON.stringify(list, null, 2) + '\n',
    'utf8',
  )
  lessons.push({
    id: lessonId,
    name: `第${lessonId}课`,
    file,
  })
  console.log(`lesson ${lessonId}: ${list.length}`)
}

const manifest = {
  courses: [{ id: 'n5', name: 'N5 基础', lessons }],
}
fs.writeFileSync(
  path.join('public', 'data', 'words', 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  'utf8',
)
console.log('done', valid.length)
