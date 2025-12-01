import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LanguageSelector from './components/LanguageSelector'
import Game from './components/Game'
import Library from './pages/Library'
import MindMap from './pages/MindMap'
import Test from './pages/Test'
import Completion from './pages/Completion'
import { resetTurnCount } from './utils/turnCounter'

function App() {
  const [language, setLanguage] = useState(null)
  const [username, setUsername] = useState('')

  const handleStart = ({ language: lang, username: name }) => {
    resetTurnCount()
    setLanguage(lang)
    setUsername(name)
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
      <Route path="/completion" element={<Completion language={language} username={username} />} />
    </Routes>
  )
}

export default App

