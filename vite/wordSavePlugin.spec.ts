import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { enqueueWordWrite, persistWordAppend } from './wordSavePlugin'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'word-save-'))
  roots.push(root)
  await mkdir(join(root, 'public', 'data', 'words', 'beginner-upper'), { recursive: true })
  await writeFile(
    join(root, 'public', 'data', 'words', 'manifest.json'),
    JSON.stringify({
      books: [
        {
          code: 'beginner-upper',
          name: '初级上册',
          level: 'beginner',
          volume: 'upper',
          units: [
            {
              unit: 1,
              name: '第1单元',
              lessons: [{ id: 1, lesson: 1, name: '第1课', file: 'beginner-upper/lesson-01.json' }],
              pages: [
                { id: 'spring', name: '单元末-词语之泉', lesson: 101, file: 'beginner-upper/unit-01-spring.json' },
              ],
            },
          ],
        },
      ],
    }),
  )
  return root
}

const body = JSON.stringify({
  bookId: 'beginner-upper',
  unit: 1,
  lesson: 1,
  cn: '大学生',
  jp: 'だいがくせい',
  jp_write: '大学生',
  describe: '',
  part_of_speech: '名',
})

describe('persistWordAppend', () => {
  it('appends one object to an existing lesson file', async () => {
    const root = await tempRoot()
    const file = join(root, 'public', 'data', 'words', 'beginner-upper', 'lesson-01.json')
    await writeFile(file, '[{"cn":"学生","jp":"がくせい"}]\n')

    const result = await persistWordAppend(root, body)

    expect(result.status).toBe(200)
    expect(JSON.parse(result.body)).toEqual({ ok: true })
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual([
      { cn: '学生', jp: 'がくせい' },
      {
        cn: '大学生',
        jp: 'だいがくせい',
        jp_write: '大学生',
        describe: '',
        part_of_speech: '名',
      },
    ])
  })

  it('creates a missing word-list file', async () => {
    const root = await tempRoot()
    const spring = { ...JSON.parse(body), lesson: 101 }
    const result = await persistWordAppend(root, JSON.stringify(spring))
    expect(result.status).toBe(200)
    const text = await readFile(
      join(root, 'public', 'data', 'words', 'beginner-upper', 'unit-01-spring.json'),
      'utf8',
    )
    expect(JSON.parse(text)).toHaveLength(1)
  })

  it('does not change a file that is not an array', async () => {
    const root = await tempRoot()
    const file = join(root, 'public', 'data', 'words', 'beginner-upper', 'lesson-01.json')
    await writeFile(file, '{"cn":"学生"}\n')
    const result = await persistWordAppend(root, body)
    expect(result.status).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ message: '词表不是数组' })
    expect(await readFile(file, 'utf8')).toBe('{"cn":"学生"}\n')
  })

  it('does not write outside the words directory', async () => {
    const root = await tempRoot()
    const manifestPath = join(root, 'public', 'data', 'words', 'manifest.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.books[0].units[0].lessons[0].file = '../secret.json'
    await writeFile(manifestPath, JSON.stringify(manifest))
    const result = await persistWordAppend(root, body)
    expect(result.status).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ message: '路径不合法' })
    await expect(readFile(join(root, 'public', 'data', 'secret.json'), 'utf8')).rejects.toThrow()
  })
})

describe('enqueueWordWrite', () => {
  it('runs overlapping writes one at a time', async () => {
    let current = 0
    let max = 0
    const task = () =>
      enqueueWordWrite(async () => {
        current += 1
        max = Math.max(max, current)
        await new Promise((resolve) => setTimeout(resolve, 20))
        current -= 1
      })
    await Promise.all([task(), task()])
    expect(max).toBe(1)
  })
})
