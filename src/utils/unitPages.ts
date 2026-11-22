import type { UnitMeta, UnitPageMeta } from '../types/word.ts'

/**
 * 判断这个单元页面是不是一份词表。
 * 课号用来筛选和抽题，文件路径不能跳出词库目录。
 *
 * @param page 单元页面
 * @return 有合法课号和词表文件时为 true
 */
export function isWordPage(page: UnitPageMeta): page is UnitPageMeta & { lesson: number; file: string } {
  return (
    typeof page.lesson === 'number' &&
    Number.isInteger(page.lesson) &&
    page.lesson >= 1 &&
    typeof page.file === 'string' &&
    page.file.length > 0 &&
    !page.file.startsWith('/') &&
    !page.file.split('/').includes('..')
  )
}

/**
 * 列出单元里带词表的页面。
 *
 * @param unit 单元；没有单元时为空
 * @return 词语之泉这类页面
 */
export function wordPages(unit: UnitMeta | undefined): Array<UnitPageMeta & { lesson: number; file: string }> {
  return (unit?.pages ?? []).filter(isWordPage)
}
