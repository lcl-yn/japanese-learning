import type { Word, WordsManifest } from '@/types/word'

const DEFAULT_BASE = '/data/words'

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
          const raw = (await res.json()) as Omit<Word, 'courseId'>[]
          return raw.map((w) => ({ ...w, courseId: course.id }))
        }),
      )
    }
  }

  const chunks = await Promise.all(tasks)
  return { manifest, words: chunks.flat() }
}
