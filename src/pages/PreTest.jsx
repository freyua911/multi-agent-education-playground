import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Test.css'
import './PreTest.css'

function PreTest({ language, username }) {
  const navigate = useNavigate()
  const isZh = language === 'zh'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    age: '',
    major: '',
    q3: '',
    q11: '',
    q12: '',
    q13: '',
    q14: '',
    q15: '',
    q16: '',
    q17: ''
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleStartGame = async () => {
    // 检查必答问题
    const missingFields = []
    
    if (!form.age) {
      missingFields.push(isZh ? '年龄' : 'Age')
    }
    
    if (!form.q3) {
      missingFields.push(isZh ? 'AI使用程度' : 'AI Usage')
    }
    
    // 检查第四部分（Q11-Q15）
    const section4Questions = ['q11', 'q12', 'q13', 'q14', 'q15']
    const missingSection4 = section4Questions.filter(q => !form[q])
    
    if (missingSection4.length > 0) {
      missingFields.push(isZh ? '第二部分问题' : 'Section 2 Questions')
    }
    
    if (missingFields.length > 0) {
      const message = isZh 
        ? `请完成以下必答问题：${missingFields.join('、')}`
        : `Please complete the following required questions: ${missingFields.join(', ')}`
      alert(message)
      return
    }
    
    // 所有必答问题都已回答，保存问卷
    setSubmitting(true)
    setError('')
    
    try {
      const response = await fetch('/api/save-pretest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username || null,
          language: language || null,
          responses: form
        })
      })
      
      if (!response.ok) {
        const text = await response.text()
        console.error('Failed to save pretest:', text)
        throw new Error(isZh ? '保存问卷失败，请稍后重试。' : 'Failed to save questionnaire. Please try again later.')
      }
      
      // 保存成功，进入游戏
      navigate('/game')
    } catch (err) {
      console.error('PreTest submit error:', err)
      setError(err.message || (isZh ? '提交失败，请稍后重试。' : 'Submit failed. Please try again.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="test-container pretest-container">
      <header className="test-top-bar">
        <div>
          <h1>{isZh ? '前测问卷' : 'Pre-Test Questionnaire'}</h1>
          <p>
            {isZh
              ? '在进入Stratux游戏前，请先回答以下问题，帮助我们更好的了解你的背景与对AI的了解。'
              : 'Before entering Stratux, please answer these questions so we can better understand your background and understanding of AI.'}
          </p>
        </div>
        <div className="test-top-actions">
          <button 
            className="test-end-btn" 
            onClick={handleStartGame}
            disabled={submitting}
          >
            {submitting 
              ? (isZh ? '保存中…' : 'Saving…')
              : (isZh ? '开始游戏' : 'Start Game')}
          </button>
        </div>
      </header>

      <div className="test-main pretest-main">
        <form className="pretest-form-wrapper">
          <section className="test-panel pretest-panel pretest-panel-left">
            <div className="test-chat-feed pretest-form">
              <div className="pretest-topic-header">
                <h3>{isZh ? '1. 基本信息' : '1. Basic Information'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请提供一些关于您的基本背景信息，这些信息将被记录并用于学术研究，一经完成研究将被完全删除。'
                    : 'Please provide some basic background information about yourself. This information will be recorded and used for academic research, and will be completely deleted upon completion of the research.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="age"><strong>{isZh ? 'Q1. 年龄：' : 'Q1. Age:'}</strong></label>
                <div className="pretest-options">
                  {[
                    { value: '0-20', label: isZh ? '0-20岁' : '0-20' },
                    { value: '20-30', label: isZh ? '20-30岁' : '20-30' },
                    { value: '30-40', label: isZh ? '30-40岁' : '30-40' },
                    { value: '40-50', label: isZh ? '40-50岁' : '40-50' },
                    { value: '50+', label: isZh ? '50岁以上' : '50+' }
                  ].map(option => (
                    <label key={option.value} className="pretest-radio-label">
                      <input
                        type="radio"
                        name="age"
                        value={option.value}
                        checked={form.age === option.value}
                        onChange={(e) => handleChange('age', e.target.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pretest-question">
                <label htmlFor="major"><strong>{isZh ? 'Q2. 专业/学科背景：' : 'Q2. Major/Disciplinary Background:'}</strong></label>
                <input
                  id="major"
                  type="text"
                  className="pretest-input"
                  value={form.major}
                  onChange={(e) => handleChange('major', e.target.value)}
                />
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? 'Q3. 您是否使用过任何的AI工具（如ChatGPT、GEMINI等）？' : 'Q3. Have you ever used any AI tools (e.g., ChatGPT, GEMINI, etc.)?'}</strong></label>
                <div className="pretest-options">
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q3"
                      value="A"
                      checked={form.q3 === 'A'}
                      onChange={(e) => handleChange('q3', e.target.value)}
                    />
                    <span>{isZh ? 'A. 每天都使用' : 'A. Use everyday'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q3"
                      value="B"
                      checked={form.q3 === 'B'}
                      onChange={(e) => handleChange('q3', e.target.value)}
                    />
                    <span>{isZh ? 'B. 经常使用（每周3-4天使用）' : 'B. Use frequently (3-4 days per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q3"
                      value="C"
                      checked={form.q3 === 'C'}
                      onChange={(e) => handleChange('q3', e.target.value)}
                    />
                    <span>{isZh ? 'C. 偶尔使用（每周1-2天使用）' : 'C. Use occasionally (1-2 days per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q3"
                      value="D"
                      checked={form.q3 === 'D'}
                      onChange={(e) => handleChange('q3', e.target.value)}
                    />
                    <span>{isZh ? 'D. 从未使用过' : 'D. Have never used them'}</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="test-panel pretest-panel pretest-panel-right">
            <div className="test-chat-feed pretest-form">
              <div className="pretest-topic-header">
                <h3>{isZh ? '2. 对AI在教育中的当前理解与态度' : '2. Current Understanding and Attitudes Towards AI in Education'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '这些问题询问您当前对AI被应用在教育领域的看法，请您根据自己的实际体验和经验回答'
                    : 'These questions ask about your current views on AI being applied in the field of education. Please answer based on your actual experience and knowledge.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              {[
                { 
                  id: 'q11', 
                  text: isZh 
                    ? '在我看来，AI已经可以在一定程度上替代传统的教学解释（例如，解释知识点）。' 
                    : 'In my view, AI can already, to some extent, replace traditional instructional explanations (e.g., explaining knowledge points).' 
                },
                { 
                  id: 'q12', 
                  text: isZh 
                    ? '在我看来，AI更适合作为辅助工具，而不是完全替代人类教师。' 
                    : 'In my view, AI is better suited as an auxiliary tool rather than a complete replacement for human teachers.' 
                },
                { 
                  id: 'q13', 
                  text: isZh 
                    ? '我目前认为AI可以为不同学生提供针对性的学习支持。' 
                    : 'I currently believe that AI can provide targeted learning support tailored to the needs of different students.' 
                },
                { 
                  id: 'q14', 
                  text: isZh 
                    ? '我对"将AI用于教育和评估"总体上持开放态度。' 
                    : 'I am generally open-minded about "using AI for education and assessment".' 
                },
                { 
                  id: 'q15', 
                  text: isZh 
                    ? '我对AI在教育中的风险和局限性有相对清晰的理解。' 
                    : 'I have a relatively clear understanding of the risks and limitations of AI in education.' 
                }
              ].map(item => (
                <div key={item.id} className="pretest-question">
                  <label><strong>{item.id.toUpperCase()}.</strong> {item.text}</label>
                  <div className="pretest-scale-options">
                    {[
                      { val: 1, label: isZh ? '非常不同意' : 'Strongly Disagree' },
                      { val: 2, label: isZh ? '不同意' : 'Disagree' },
                      { val: 3, label: isZh ? '中立' : 'Neutral' },
                      { val: 4, label: isZh ? '同意' : 'Agree' },
                      { val: 5, label: isZh ? '非常同意' : 'Strongly Agree' }
                    ].map(({ val, label }) => (
                      <label key={val} className="pretest-scale-option">
                        <input
                          type="radio"
                          name={item.id}
                          value={String(val)}
                          checked={form[item.id] === String(val)}
                          onChange={(e) => handleChange(item.id, e.target.value)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pretest-topic-header">
                <h3>{isZh ? '3. 开放性问题（可选）' : '3. Open-ended Questions (Optional)'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '最后，请用您自己的话分享您关于AI和教育的想法。'
                    : 'Finally, please share your own thoughts about AI and education in your own words.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q16"><strong>{isZh ? 'Q16.' : 'Q16.'}</strong> {isZh ? '选择你感兴趣的角度，您认为未来的学生和老师该如何与AI相处？' : 'From your perspective of interest, how do you think future students and teachers should interact with AI?'}</label>
                <textarea
                  id="q16"
                  className="pretest-textarea"
                  value={form.q16}
                  onChange={(e) => handleChange('q16', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pretest-question">
                <label htmlFor="q17"><strong>{isZh ? 'Q17.' : 'Q17.'}</strong> {isZh ? '您认为AI相较于人类的劣势在哪些方面？这些劣势如何影响AI在教育中的角色？' : 'What do you think are the disadvantages of AI compared to humans? How do these disadvantages affect AI\'s role in education?'}</label>
                <textarea
                  id="q17"
                  className="pretest-textarea"
                  value={form.q17}
                  onChange={(e) => handleChange('q17', e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </section>

          {error && <div className="pretest-error">{error}</div>}
        </form>
      </div>
    </div>
  )
}

export default PreTest
