import {
  WORD_APPEND_FAILED,
  WORD_SAVE_PATH,
  parseWordAppendBody,
  type WordAppendBody,
} from '@/utils/wordAppend'

/**
 * 把一条新词交给开发服务器，追加到对应课次 JSON。
 * 字段不合法时不发请求。接口失败时抛出服务器返回的原因。
 *
 * @param body 册、单元、课和五个词字段
 */
export async function saveNewWord(body: WordAppendBody): Promise<void> {
  const parsed = parseWordAppendBody(body)
  if (!parsed.ok) throw new Error(parsed.message)
  const res = await fetch(WORD_SAVE_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.value),
  })
  if (res.ok) return
  let message = WORD_APPEND_FAILED
  try {
    const payload = (await res.json()) as { message?: unknown }
    if (typeof payload.message === 'string' && payload.message) message = payload.message
  } catch {
    message = WORD_APPEND_FAILED
  }
  throw new Error(message)
}
