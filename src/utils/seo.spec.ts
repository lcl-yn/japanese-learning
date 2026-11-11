import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_DOCUMENT_TITLE,
  KANA_DESCRIPTION,
  PRACTICE_DESCRIPTION,
  applyDocumentSeo,
  canonicalHref,
  formatDocumentTitle,
  resolveDescription,
  resolvePageTitle,
  resolveRobots,
} from './seo'

describe('formatDocumentTitle', () => {
  it('uses the site title when the page has no name', () => {
    expect(formatDocumentTitle('')).toBe(DEFAULT_DOCUMENT_TITLE)
    expect(formatDocumentTitle('日语学习')).toBe(DEFAULT_DOCUMENT_TITLE)
  })

  it('puts the page name before the site name', () => {
    expect(formatDocumentTitle('五十音图：清音、浊音与拗音')).toBe('五十音图：清音、浊音与拗音｜日语学习')
  })
})

describe('resolvePageTitle', () => {
  it('uses the fixed search title for kana and the word list', () => {
    expect(resolvePageTitle(['50音图'], { seoTitle: '五十音图：清音、浊音与拗音' })).toBe(
      '五十音图：清音、浊音与拗音',
    )
    expect(resolvePageTitle([], { title: '单词本', seoTitle: '日语单词本' })).toBe('日语单词本')
  })

  it('includes the book, unit and lesson for study pages', () => {
    const crumbs = ['初级上册', '第1单元', '第1课', '单词']
    expect(resolvePageTitle(crumbs, { section: 'practice', title: '单词' })).toBe(
      '初级上册 · 第1单元 · 第1课 · 单词练习',
    )
  })
})

describe('resolveDescription', () => {
  it('keeps the page description until a lesson location is known', () => {
    expect(resolveDescription(['50音图'], { description: KANA_DESCRIPTION })).toBe(KANA_DESCRIPTION)
    expect(resolveDescription([], {})).toBe(DEFAULT_DESCRIPTION)
  })

  it('prefixes the lesson location on study pages', () => {
    const crumbs = ['初级上册', '第1单元', '第1课', '单词']
    expect(resolveDescription(crumbs, { section: 'practice', description: PRACTICE_DESCRIPTION })).toBe(
      `初级上册第1单元第1课：${PRACTICE_DESCRIPTION}`,
    )
  })
})

describe('resolveRobots', () => {
  it('allows indexing unless the route says otherwise', () => {
    expect(resolveRobots({})).toBe('index,follow')
    expect(resolveRobots({ robots: 'noindex,follow' })).toBe('noindex,follow')
  })
})

describe('canonicalHref', () => {
  it('drops the hash and query', () => {
    expect(canonicalHref('https://lcl-yn.github.io/japanese-learning/kana?from=share#marks')).toBe(
      'https://lcl-yn.github.io/japanese-learning/kana',
    )
  })
})

describe('applyDocumentSeo', () => {
  it('writes the title, description and share tags', () => {
    applyDocumentSeo({
      title: '日语单词本',
      description: '按册查阅单词。',
      robots: 'index,follow',
    })

    expect(document.title).toBe('日语单词本｜日语学习')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('按册查阅单词。')
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      '日语单词本｜日语学习',
    )
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      canonicalHref(window.location.href),
    )
  })
})
