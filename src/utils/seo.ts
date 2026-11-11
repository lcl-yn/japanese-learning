/** 与 index.html 里的 title、description 保持同一句，方便未执行脚本的抓取。 */
export const SITE_NAME = '日语学习'

export const SITE_TAGLINE = '五十音图、单词练习与单词本'

export const DEFAULT_DOCUMENT_TITLE = `${SITE_NAME}｜${SITE_TAGLINE}`

export const DEFAULT_DESCRIPTION =
  '在线日语学习：五十音图点击朗读，按册、单元、课练习看中文写日语和看日语写中文，并在单词本里对照假名与汉字。'

export const KANA_SEO_TITLE = '五十音图：清音、浊音与拗音'

export const KANA_DESCRIPTION =
  '平假名五十音图，包含清音、浊音、半浊音和拗音。点击假名即可朗读，并查看浊音符号、半浊音符号和长音。'

export const WORDS_SEO_TITLE = '日语单词本'

export const WORDS_DESCRIPTION = '按册、单元和课查阅日语单词，对照中文、假名和手写，并可朗读复习。'

export const PRACTICE_DESCRIPTION = '看中文写假名和手写，或看日语写中文。答错的词下次更容易被抽到。'

export const READING_DESCRIPTION = '日语课文还在整理，暂时没有可阅读的内容。'

export const GRAMMAR_DESCRIPTION = '日语语法还在整理，暂时没有可学习的内容。'

const SECTION_LABEL: Record<string, string> = {
  practice: '单词练习',
  reading: '课文',
  grammar: '语法',
}

export interface SeoMeta {
  title?: unknown
  seoTitle?: unknown
  description?: unknown
  robots?: unknown
  section?: unknown
}

export interface DocumentSeo {
  title: string
  description: string
  robots: string
}

/**
 * 浏览器标签标题。没有页面名时用整站标题。
 *
 * @param pageTitle 当前页名称
 * @return 写入 document.title 的文本
 */
export function formatDocumentTitle(pageTitle: string): string {
  const name = pageTitle.trim()
  if (!name || name === SITE_NAME) return DEFAULT_DOCUMENT_TITLE
  return `${name}｜${SITE_NAME}`
}

/**
 * 拼当前页在检索结果里的名称。
 * 练习、课文、语法带上册、单元和课；五十音图和单词本用固定检索标题。
 *
 * @param crumbs 面包屑，最后一项是栏目标题
 * @param meta 路由上的标题与栏目
 * @return 页面名称，不含站点名
 */
export function resolvePageTitle(crumbs: readonly string[], meta: SeoMeta): string {
  const section = typeof meta.section === 'string' ? meta.section : ''
  const label = SECTION_LABEL[section]
  if (label && crumbs.length > 0) {
    return [...crumbs.slice(0, -1), label].join(' · ')
  }
  if (typeof meta.seoTitle === 'string' && meta.seoTitle.trim()) return meta.seoTitle.trim()
  if (crumbs.length > 0) return crumbs.join(' · ')
  if (typeof meta.title === 'string' && meta.title.trim()) return meta.title.trim()
  return SITE_NAME
}

/**
 * 有册、单元或课时，把位置接在简介前面，让每一课的说明可以区分开。
 *
 * @param crumbs 面包屑，最后一项是栏目标题
 * @param meta 路由上的简介与栏目
 * @return 写入 description 的文本
 */
export function resolveDescription(crumbs: readonly string[], meta: SeoMeta): string {
  const fallback =
    typeof meta.description === 'string' && meta.description.trim()
      ? meta.description.trim()
      : DEFAULT_DESCRIPTION
  const section = typeof meta.section === 'string' ? meta.section : ''
  if (!SECTION_LABEL[section] || crumbs.length < 2) return fallback
  return `${crumbs.slice(0, -1).join('')}：${fallback}`
}

/**
 * 未单独声明时允许收录。
 *
 * @param meta 路由上的 robots
 * @return robots 指令
 */
export function resolveRobots(meta: SeoMeta): string {
  return typeof meta.robots === 'string' && meta.robots.trim() ? meta.robots.trim() : 'index,follow'
}

/**
 * 去掉哈希和查询，避免同一页因为地址尾巴被当成多页。
 *
 * @param href 当前地址
 * @return 规范地址
 */
export function canonicalHref(href: string): string {
  const url = new URL(href)
  url.hash = ''
  url.search = ''
  return `${url.origin}${url.pathname}`
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

/**
 * 把当前页的标题、简介和分享信息写进文档头。
 *
 * @param seo 当前页标题、简介和收录指令
 */
export function applyDocumentSeo(seo: DocumentSeo): void {
  const title = formatDocumentTitle(seo.title)
  document.title = title
  upsertMeta('name', 'description', seo.description)
  upsertMeta('name', 'robots', seo.robots)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', seo.description)
  upsertMeta('property', 'og:url', canonicalHref(window.location.href))
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', seo.description)
  upsertCanonical(canonicalHref(window.location.href))
}
