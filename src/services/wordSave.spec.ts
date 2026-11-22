import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORD_APPEND_EMPTY, WORD_APPEND_FAILED, WORD_SAVE_PATH, WORD_UPDATE_PATH } from '@/utils/wordAppend'
import { saveNewWord, saveUpdatedWord } from './wordSave'

const body = {
  bookId: 'beginner-upper',
  unit: 1,
  lesson: 1,
  cn: ' 大学生 ',
  jp: 'だいがくせい',
  jp_write: '大学生',
  describe: '',
  part_of_speech: '',
}

describe('saveNewWord', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts the trimmed word on the dev endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ok: true }))
    await saveNewWord(body)
    expect(fetch).toHaveBeenCalledWith(WORD_SAVE_PATH, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, cn: '大学生' }),
    })
  })

  it('does not send a blank required field', async () => {
    await expect(saveNewWord({ ...body, jp: '  ' })).rejects.toThrow(WORD_APPEND_EMPTY)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows the server message, or a generic failure when the body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ message: '清单里没有这一课' }, { status: 400 }))
    await expect(saveNewWord(body)).rejects.toThrow('清单里没有这一课')

    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 500 }))
    await expect(saveNewWord(body)).rejects.toThrow(WORD_APPEND_FAILED)
  })

  it('puts the edited word on the update endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ok: true }))
    await saveUpdatedWord({ ...body, fileIndex: 2 })
    expect(fetch).toHaveBeenCalledWith(WORD_UPDATE_PATH, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, cn: '大学生', fileIndex: 2 }),
    })
  })
})
