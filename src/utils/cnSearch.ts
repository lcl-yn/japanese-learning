/** 一条中文释义里，并列义项的分隔符。 */
const CN_SENSE_SEPARATOR = /[,，、；;]/

/**
 * 判断中文释义是否命中前缀搜索。
 * 按逗号、顿号、分号拆开后，任一条去掉空白后以关键字开头即命中。关键字为空时保留该词。
 *
 * @param cn 词条中文释义
 * @param query 搜索框里的关键字
 * @return 是否应出现在搜索结果里
 */
export function matchesCnPrefix(cn: string, query: string): boolean {
  const keyword = query.trim()
  if (!keyword) return true
  return cn.split(CN_SENSE_SEPARATOR).some((sense) => sense.trim().startsWith(keyword))
}
