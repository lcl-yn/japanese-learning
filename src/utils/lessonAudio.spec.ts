import { describe, expect, it, vi } from 'vitest'
import {
  claimLessonAudio,
  releaseLessonAudio,
  compareLessonAudio,
  lessonAudioLabel,
  lessonAudioNamesForBook,
  lessonAudioUrl,
  listLessonAudioNames,
  listLessonAudioPaths,
  orderLessonAudioForLesson,
} from './lessonAudio'

describe('lessonAudioLabel', () => {
  it('drops the book folder and extension', () => {
    expect(lessonAudioLabel('/data/audio/beginner-upper/第4课基本课文.m4a')).toBe('第4课基本课文')
  })
})

describe('lessonAudioUrl', () => {
  it('keeps the site prefix and encodes the file name', () => {
    expect(lessonAudioUrl('/data/audio/beginner-upper/第4课基本课文.m4a', '/repo/')).toBe(
      '/repo/data/audio/beginner-upper/%E7%AC%AC4%E8%AF%BE%E5%9F%BA%E6%9C%AC%E8%AF%BE%E6%96%87.m4a',
    )
  })
})

describe('listLessonAudioNames', () => {
  it('sorts by lesson number, then text kind, and leaves other names last', () => {
    expect(
      listLessonAudioNames([
        '第2课课后练习.m4a',
        '第10课基本课文.m4a',
        '第2课基本课文.m4a',
        '第2课应用课文.m4a',
        '备注.mp3',
        'notes.txt',
      ]),
    ).toEqual([
      '第2课基本课文.m4a',
      '第2课应用课文.m4a',
      '第2课课后练习.m4a',
      '第10课基本课文.m4a',
      '备注.mp3',
    ])
  })
})

describe('orderLessonAudioForLesson', () => {
  it('pins the current lesson without treating lesson 1 as lesson 10', () => {
    const names = ['第1课基本课文.m4a', '第10课基本课文.m4a', '第10课应用课文.m4a', '第2课基本课文.m4a']
    expect(orderLessonAudioForLesson(names, 10)).toEqual([
      '第10课基本课文.m4a',
      '第10课应用课文.m4a',
      '第1课基本课文.m4a',
      '第2课基本课文.m4a',
    ])
  })
})

describe('lessonAudioNamesForBook', () => {
  it('keeps only the requested book', () => {
    const paths = listLessonAudioPaths([
      { bookId: 'beginner-upper', fileNames: ['第2课课后练习.m4a', '第2课基本课文.m4a', 'notes.txt'] },
      { bookId: 'beginner-lower', fileNames: ['第1课基本课文.m4a'] },
      { bookId: '../secret', fileNames: ['第1课基本课文.m4a'] },
    ])
    expect(lessonAudioNamesForBook(paths, 'beginner-upper')).toEqual(['第2课基本课文.m4a', '第2课课后练习.m4a'])
    expect(lessonAudioNamesForBook(paths, 'beginner-lower')).toEqual(['第1课基本课文.m4a'])
  })
})

describe('compareLessonAudio', () => {
  it('orders lesson 2 before lesson 10', () => {
    expect(compareLessonAudio('第2课基本课文.m4a', '第10课基本课文.m4a')).toBeLessThan(0)
  })
})

describe('claimLessonAudio', () => {
  it('pauses the previous clip when another starts', () => {
    const first = { pause: vi.fn() }
    const second = { pause: vi.fn() }
    claimLessonAudio(first)
    claimLessonAudio(second)
    expect(first.pause).toHaveBeenCalledOnce()
    claimLessonAudio(second)
    expect(second.pause).not.toHaveBeenCalled()
  })

  it('cancels a pending replay on the previous clip', () => {
    const first = { pause: vi.fn(), cancelReplay: vi.fn() }
    const second = { pause: vi.fn() }
    claimLessonAudio(first)
    claimLessonAudio(second)
    expect(first.cancelReplay).toHaveBeenCalledOnce()
    expect(first.pause).toHaveBeenCalledOnce()
  })

  it('does not pause a clip after it releases playback', () => {
    const first = { pause: vi.fn() }
    claimLessonAudio(first)
    releaseLessonAudio(first)
    claimLessonAudio({ pause: vi.fn() })
    expect(first.pause).not.toHaveBeenCalled()
  })
})
