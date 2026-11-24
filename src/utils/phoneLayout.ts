import { ref } from 'vue'

/** 桌面壳放不下时的宽度。再窄的电脑窗口仍走桌面布局。 */
export const PHONE_LAYOUT_MAX_WIDTH = 959

const NARROW_QUERY = `(max-width: ${PHONE_LAYOUT_MAX_WIDTH}px)`
const HOVER_NONE_QUERY = '(hover: none)'
const POINTER_COARSE_QUERY = '(pointer: coarse)'

export interface PhoneLayoutSignals {
  /** 视口宽度不超过 PHONE_LAYOUT_MAX_WIDTH */
  narrow: boolean
  /** 主指针点不中悬停 */
  hoverNone: boolean
  /** 主指针是触摸这类粗指针 */
  pointerCoarse: boolean
}

/**
 * 是否走手机布局。
 * 视口够窄、主指针是触摸、并且点不中悬停，三条同时成立才算。
 * 电脑把窗口拉窄时仍能悬停，保持桌面布局。
 *
 * @param signals 视口与主指针的当前状态
 * @return 为真时使用手机布局
 */
export function isPhoneLayout(signals: PhoneLayoutSignals): boolean {
  return signals.narrow && signals.hoverNone && signals.pointerCoarse
}

/** 当前是否手机布局。挂载前由 installPhoneLayout 写上。 */
export const phoneLayout = ref(false)

let installed = false

/**
 * 在首次绘制前记下手机还是桌面，并在窗口或指针变化时更新。
 * 结果写在 html[data-layout] 上，样式和页面共用这一处。
 */
export function installPhoneLayout() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const narrowQuery = window.matchMedia(NARROW_QUERY)
  const hoverQuery = window.matchMedia(HOVER_NONE_QUERY)
  const pointerQuery = window.matchMedia(POINTER_COARSE_QUERY)
  const sync = () => {
    const phone = isPhoneLayout({
      narrow: narrowQuery.matches,
      hoverNone: hoverQuery.matches,
      pointerCoarse: pointerQuery.matches,
    })
    phoneLayout.value = phone
    document.documentElement.dataset.layout = phone ? 'phone' : 'desktop'
  }
  sync()
  narrowQuery.addEventListener('change', sync)
  hoverQuery.addEventListener('change', sync)
  pointerQuery.addEventListener('change', sync)
}
