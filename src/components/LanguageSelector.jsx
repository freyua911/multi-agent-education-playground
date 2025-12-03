import './LanguageSelector.css'
import { useState } from 'react'

function LanguageSelector({ onSelect }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  const startWith = (lang, nextPath) => {
    if (!username.trim()) {
      setError(lang === 'zh' ? '请输入用户名' : 'Please enter a username')
      return
    }
    onSelect({ language: lang, username: username.trim(), nextPath })
  }

  const handleLanguageClick = (lang) => {
    setSelectedLanguage(lang)
    setError('')
  }

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  const handleStartButtonClick = () => {
    startWith(selectedLanguage, '/game')
  }

  const handlePretestButtonClick = () => {
    startWith(selectedLanguage, '/pretest')
  }

  const subtitleLines = selectedLanguage === 'zh'
    ? ['这是一个AI辅助教育平台的研究原型，这里会有不同的AI角色与你互动来共同完成你的学习目标。', '收集的数据仅供研究使用，感谢你的测试体验与反馈！']
    : ['This is a research prototype for an AI-assisted learning platform, where different AI roles will interact with you to complete your learning goals together.', 'Data collected is for research purposes only. Thank you for your testing experience and feedback!']

  const hintText = selectedLanguage === 'zh'
    ? '输入昵称，并选择测试语言即可开始体验,在开始游戏前有个问卷需要请你填写，感谢～。'
    : 'Enter your nickname and choose a language to begin. Please complete a questionnaire before starting the game. Thank you!'

  return (
    <div className="language-selector">
      <div className="language-selector-content">
        <h1>Stratux</h1>
        <p className="language-selector-subtitle">
          {subtitleLines.map((line, index) => (
            <span key={index}>
              {line}
              {index !== subtitleLines.length - 1 && <br />}
            </span>
          ))}
        </p>
        <div className="language-buttons">
          <button
            type="button"
            onClick={() => handleLanguageClick('zh')}
            className={`lang-btn ${selectedLanguage === 'zh' ? 'active' : ''}`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => handleLanguageClick('en')}
            className={`lang-btn ${selectedLanguage === 'en' ? 'active' : ''}`}
          >
            English
          </button> 
        </div>
        <div className="language-form">
          <p className="language-selector-hint">{hintText}</p>
          <input
            className="name-input"
            type="text"
            placeholder="昵称 / player name"
            value={username}
            onKeyDown={handleInputKeyDown}
            onChange={(e) => { setUsername(e.target.value); setError('') }}
          />
          <div className="language-form-buttons">
            <button
              type="button"
              className="start-button"
              onClick={handleStartButtonClick}
              disabled={!username.trim()}
            >
              {selectedLanguage === 'zh' ? '进入游戏' : 'Enter Game'}
            </button>
            <button
              type="button"
              className="start-button pretest-button"
              onClick={handlePretestButtonClick}
              disabled={!username.trim()}
            >
              {selectedLanguage === 'zh' ? '前测问卷' : 'Pre-Test'}
            </button>
          </div>
          {error && <div className="name-error">{error}</div>}
        </div>
      </div>
    </div>
  )
}

export default LanguageSelector

