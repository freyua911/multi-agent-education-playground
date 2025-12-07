import './LanguageSelector.css'
import { useState } from 'react'

function LanguageSelector({ onSelect }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [showConsent, setShowConsent] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)

  const startWith = (lang, nextPath) => {
    if (!username.trim()) {
      setError(lang === 'zh' ? '请输入用户名' : 'Please enter a username')
      return
    }
    if (!consentGiven) {
      setError(
        lang === 'zh'
          ? '请先阅读并同意隐私与知情同意说明后再开始。'
          : 'Please read and accept the Privacy & Consent information before continuing.'
      )
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
    ? [
        '这是一个AI辅助教育平台的研究原型，这里会有不同的AI角色与你互动来共同完成你的学习目标。',
        '请找一个自己最近想要学习的内容或者方向开始学习呀。'
      ]
    : [
        'This is a research prototype for an AI-assisted learning platform, where different AI roles will interact with you to support your learning goals.',
        'Please find a topic you recently want to learn about and start learning.'
      ]

  const hintText = selectedLanguage === 'zh'
    ? '选择测试语言，输入昵称，阅读并同意隐私与知情同意说明后即可开始体验。在开始游戏前有个问卷需要请你填写哦～'
    : 'Enter your nickname, read and accept the Privacy & Consent information, then choose a language to begin. Please complete a questionnaire before starting the game. Thank you!'

  const handleConsentAccept = () => {
    setConsentGiven(true)
    setShowConsent(false)
    setError('')
  }

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
              disabled={!username.trim() || !consentGiven}
            >
              {selectedLanguage === 'zh' ? '进入游戏' : 'Enter Game'}
            </button>
            <button
              type="button"
              className="start-button pretest-button"
              onClick={handlePretestButtonClick}
              disabled={!username.trim() || !consentGiven}
            >
              {selectedLanguage === 'zh' ? '前测问卷' : 'Pre-Test'}
            </button>
          </div>
          {error && <div className="name-error">{error}</div>}
        </div>

        <button
          type="button"
          className="privacy-button"
          onClick={() => setShowConsent(true)}
        >
          {selectedLanguage === 'zh'
            ? '隐私与知情同意（必读）'
            : 'Privacy & Consent (required)'}
        </button>
      </div>

      {showConsent && (
        <div className="consent-overlay" onClick={() => setShowConsent(false)}>
          <div
            className="consent-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="consent-close"
              onClick={() => setShowConsent(false)}
            >
              ×
            </button>
            <h2>
              {selectedLanguage === 'zh'
                ? '隐私与数据使用说明'
                : 'Privacy and Data Use Information'}
            </h2>
            <div className="consent-body">
              {selectedLanguage === 'zh' ? (
                <>
                  <p>
                    <strong>本系统是一个用于教育研究的 AI 辅助学习原型</strong>，由研究人员在学术目的下开发和使用。
                  </p>
                  <p>
                    <strong>在本研究中：</strong>
                    <br />
                    · 你可以使用昵称参与，<em>无需提供真实姓名或可以直接识别你个人身份的信息</em>；
                    <br />
                    · 你的对话内容、问卷回答和操作记录仅用于<strong>匿名或去标识化的学术研究分析和教学改进</strong>，不用于商业目的；
                    <br />
                    · 这些数据会通过<strong>加密连接</strong>传输并存储在研究团队管理的 <strong>Supabase</strong> 数据库中，服务器位于符合 <strong>GDPR</strong> 要求的数据中心；
                    <br />
                    · 研究数据不会与学校其他行政系统（如成绩、学籍等）或外部商业服务直接关联。
                  </p>
                  <p>
                    <strong>本研究遵循欧盟《通用数据保护条例》（GDPR）以及学校关于研究数据的管理要求：</strong>
                    <br />
                    · 由于不收集可直接识别你个人身份的核心信息，研究数据在分析和报告中以<strong>匿名或去标识</strong>形式使用；
                    <br />
                    · 你的参与是<strong>自愿的</strong>，你可以随时停止使用本系统；停止后将不再产生新的数据；
                    <br />
                    · 研究结果可能以匿名汇总的形式在论文、报告或学术会议中发表，但不会出现可识别到你个人的内容；
                    <br />
                    · 数据将仅在完成本研究所必需的时间内保留，研究结束或法定保存期届满后将被<strong>删除或进一步匿名化处理</strong>。
                  </p>
                  <p>
                    继续使用本系统并点击<strong>“我已阅读并同意”</strong>即表示你已阅读并理解上述说明，并同意以<strong>匿名方式参与本研究</strong>。
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>This system is an AI-assisted learning prototype</strong> used for educational research purposes and operated by academic researchers.
                  </p>
                  <p>
                    <strong>In this study:</strong>
                    <br />
                    · You may participate using a nickname; <em>no real name or directly identifying personal data are required</em>;
                    <br />
                    · Your dialogue, questionnaire responses and interaction logs are used only for <strong>anonymised or de-identified academic research</strong> and for improving teaching and learning design, not for commercial purposes;
                    <br />
                    · These data are transmitted over <strong>encrypted connections</strong> and stored in a <strong>Supabase</strong> database managed by the research team, on infrastructure that complies with <strong>GDPR</strong> requirements;
                    <br />
                    · Research data are not directly linked to the university&apos;s administrative systems (e.g. grades, student records) or external commercial services.
                  </p>
                  <p>
                    <strong>The study follows the principles of the EU General Data Protection Regulation (GDPR) and the university&apos;s research data management policies:</strong>
                    <br />
                    · As no core directly identifying personal data are collected, the data are used in <strong>anonymous or de-identified</strong> form for analysis and reporting;
                    <br />
                    · Your participation is <strong>voluntary</strong>, and you may stop using the system at any time; once you stop, no further data from your session will be generated;
                    <br />
                    · Results may be published in aggregated, anonymous form in academic articles, reports or presentations, without any information that would identify you personally;
                    <br />
                    · Data will be retained only for as long as necessary to complete this research, and will be <strong>deleted or further anonymised</strong> after the study or the legally required retention period ends.
                  </p>
                  <p>
                    By continuing to use this system and clicking <strong>&quot;I have read and agree&quot;</strong>, you confirm that you have read and understood the above information and consent to participate in this study in an <strong>anonymised manner</strong>.
                  </p>
                </>
              )}
            </div>
            <div className="consent-actions">
              <button
                type="button"
                className="consent-ok"
                onClick={handleConsentAccept}
              >
                {selectedLanguage === 'zh' ? '我已阅读并同意' : 'I have read and agree'}
              </button>
              <button
                type="button"
                className="consent-cancel"
                onClick={() => {
                  setConsentGiven(false)
                  setShowConsent(false)
                }}
              >
                {selectedLanguage === 'zh' ? '不同意并退出' : 'I do not agree'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LanguageSelector

