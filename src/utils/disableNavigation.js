// 禁用浏览器前进后退功能，防止用户意外跳转
export const disableBrowserNavigation = () => {
  // 保存当前完整URL
  const getCurrentUrl = () => window.location.href
  
  // 监听 popstate 事件（当用户点击前进/后退按钮时触发）
  const handlePopState = () => {
    // 立即恢复到当前URL，阻止前进后退
    const currentUrl = getCurrentUrl()
    window.history.pushState(null, '', currentUrl)
    // 再push一次，确保历史栈中有足够的状态
    window.history.pushState(null, '', currentUrl)
  }

  // 添加 popstate 监听器
  window.addEventListener('popstate', handlePopState)

  // 初始化：在历史栈中添加多个状态，防止后退
  const currentUrl = getCurrentUrl()
  window.history.pushState(null, '', currentUrl)
  window.history.pushState(null, '', currentUrl)

  // 返回清理函数
  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}

// 替代方案：更激进的禁用方式
export const aggressivelyDisableNavigation = () => {
  // 每次路由变化后，立即阻止后退
  const preventBack = () => {
    window.history.pushState(null, '', window.location.href)
  }

  // 监听 popstate
  window.addEventListener('popstate', (e) => {
    preventBack()
  })

  // 初始化
  preventBack()

  // 定期检查并阻止（防止某些浏览器绕过）
  const interval = setInterval(() => {
    preventBack()
  }, 100)

  return () => {
    clearInterval(interval)
    window.removeEventListener('popstate', preventBack)
  }
}

