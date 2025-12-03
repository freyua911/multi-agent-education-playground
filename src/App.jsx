import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import LanguageSelector from './components/LanguageSelector'
import Game from './components/Game'
import Library from './pages/Library'
import MindMap from './pages/MindMap'
import Test from './pages/Test'
import Completion from './pages/Completion'
import PreTest from './pages/PreTest'
import PostTest from './pages/PostTest'
import { resetTurnCount } from './utils/turnCounter'
import { disableBrowserNavigation } from './utils/disableNavigation'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // 从 localStorage 恢复语言和用户名（刷新后保留）
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app_language')
    return saved || null
  })
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('app_username')
    return saved || ''
  })

  // 禁用浏览器前进后退功能（在路由变化时也更新）
  useEffect(() => {
    const cleanup = disableBrowserNavigation()
    return cleanup
  }, [location.pathname])

  // 保存语言和用户名到 localStorage
  useEffect(() => {
    if (language) {
      localStorage.setItem('app_language', language)
    }
    if (username) {
      localStorage.setItem('app_username', username)
    }
  }, [language, username])

  const handleStart = ({ language: lang, username: name, nextPath }) => {
    resetTurnCount()
    setLanguage(lang)
    setUsername(name)
    navigate(nextPath || '/game')
  }

  if (!language) {
    return <LanguageSelector onSelect={handleStart} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/game" replace />} />
      <Route path="/game" element={<Game language={language} username={username} />} />
      <Route path="/library" element={<Library language={language} username={username} />} />
      <Route path="/mindmap" element={<MindMap language={language} username={username} />} />
      <Route path="/test" element={<Test language={language} username={username} />} />
      <Route path="/pretest" element={<PreTest language={language} username={username} />} />
      <Route path="/posttest" element={<PostTest language={language} username={username} />} />
      <Route path="/completion" element={<Completion language={language} username={username} />} />
    </Routes>
  )
}

export default App

