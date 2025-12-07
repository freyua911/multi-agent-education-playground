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
    q2: '',
    q3: '',
    q3Other: '',
    aiTool: '',
    q4: '',
    q5: '',
    q6: '',
    q7: '',
    q8: '',
    q9: '',
    q16: '',
    q17: ''
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // 多选：切换 AI 使用目的（存为以 | 分隔的字符串，便于校验和保存）
  const togglePurpose = (value) => {
    setForm(prev => {
      const current = (prev.q3 || '').split('|').filter(Boolean)
      const exists = current.includes(value)
      const next = exists ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, q3: next.join('|') }
    })
  }

  const handleStartGame = async () => {
    // 检查必答问题
    const missingFields = []
    
    if (!form.age) {
      missingFields.push(isZh ? '年龄' : 'Age')
    }
    
    if (!form.q2) {
      missingFields.push(isZh ? 'AI使用频率' : 'AI Usage Frequency')
    }
    
    if (!form.q3) {
      missingFields.push(isZh ? 'AI使用目的' : 'AI Usage Purpose')
    }
    
    if (!form.aiTool || !form.aiTool.trim()) {
      missingFields.push(isZh ? '常用AI工具' : 'Common AI Tool')
    }
    
    // 检查第二部分（Q4-Q9，NASA Task Load Index）
    const section2Questions = ['q4', 'q5', 'q6', 'q7', 'q8', 'q9']
    const missingSection2 = section2Questions.filter(q => !form[q])
    
    if (missingSection2.length > 0) {
      missingFields.push(isZh ? '第二部分问题（任务负荷评价）' : 'Section 2 Questions (Task Load Assessment)')
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
    <div className={`test-container pretest-container ${!isZh ? 'lang-en' : ''}`} lang={language}>
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
                <label><strong>{isZh ? 'Q2. 您是否使用过任何的AI工具（如ChatGPT、GEMINI等）？' : 'Q2. Have you ever used any AI tools (e.g., ChatGPT, GEMINI, etc.)?'}</strong></label>
                <div className="pretest-options">
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q2"
                      value="A"
                      checked={form.q2 === 'A'}
                      onChange={(e) => handleChange('q2', e.target.value)}
                    />
                    <span>{isZh ? 'A. 每天都使用' : 'A. Use everyday'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q2"
                      value="B"
                      checked={form.q2 === 'B'}
                      onChange={(e) => handleChange('q2', e.target.value)}
                    />
                    <span>{isZh ? 'B. 经常使用（每周3-4天使用）' : 'B. Use frequently (3-4 days per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q2"
                      value="C"
                      checked={form.q2 === 'C'}
                      onChange={(e) => handleChange('q2', e.target.value)}
                    />
                    <span>{isZh ? 'C. 偶尔使用（每周1-2天使用）' : 'C. Use occasionally (1-2 days per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q2"
                      value="D"
                      checked={form.q2 === 'D'}
                      onChange={(e) => handleChange('q2', e.target.value)}
                    />
                    <span>{isZh ? 'D. 从未使用过' : 'D. Have never used them'}</span>
                  </label>
                </div>
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? 'Q3. 您通常出于哪些目的使用AI工具（如ChatGPT、GEMINI等）？（可多选）' : 'Q3. For what purposes do you usually use AI tools (e.g., ChatGPT, GEMINI)? (Multiple choices allowed)'}</strong></label>
                <div className="pretest-options pretest-options-column">
                  {[
                    {
                      value: 'learn',
                      labelZh: '学习知识 / 完成课程相关任务',
                      labelEn: 'Learning / course-related study'
                    },
                    {
                      value: 'chat',
                      labelZh: '日常聊天 / 消遣娱乐',
                      labelEn: 'Casual chatting / entertainment'
                    },
                    {
                      value: 'work',
                      labelZh: '与工作或科研内容相关的任务',
                      labelEn: 'Work- or research-related tasks'
                    }
                  ].map(option => {
                    const selected = (form.q3 || '').split('|').filter(Boolean)
                    const checked = selected.includes(option.value)
                    return (
                      <label key={option.value} className="pretest-checkbox-label">
                        <input
                          type="checkbox"
                          name="q3"
                          value={option.value}
                          checked={checked}
                          onChange={() => togglePurpose(option.value)}
                        />
                        <span>{isZh ? option.labelZh : option.labelEn}</span>
                      </label>
                    )
                  })}
                  {/* 其他 + 文本框 */}
                  {(() => {
                    const selected = (form.q3 || '').split('|').filter(Boolean)
                    const checked = selected.includes('other')
                    return (
                      <div className="pretest-checkbox-other">
                        <label className="pretest-checkbox-label">
                          <input
                            type="checkbox"
                            name="q3"
                            value="other"
                            checked={checked}
                            onChange={() => togglePurpose('other')}
                          />
                          <span>{isZh ? '其他（请简要说明）' : 'Other (please specify)'}</span>
                        </label>
                        <input
                          type="text"
                          className="pretest-input pretest-input-other"
                          placeholder={isZh ? '例如：竞赛、创作、兴趣项目等' : 'e.g., competitions, creative projects, personal interests'}
                          value={form.q3Other || ''}
                          onChange={(e) => handleChange('q3Other', e.target.value)}
                        />
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </section>

          <section className="test-panel pretest-panel pretest-panel-right">
            <div className="test-chat-feed pretest-form">
              <div className="pretest-topic-header">
                <h3>{isZh ? '2. 任务负荷评价（NASA Task Load Index，简化版）' : '2. Task Load Assessment (NASA Task Load Index, simplified)'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请先填写您最常用的AI工具，然后基于该工具的使用体验来回答以下问题。请回想您在使用该工具进行「学习」时的体验。如果您想不起来具体的感受，可以现在打开该工具体验一下，然后再回来回答以下问题。请根据您的实际体验，评价下面几个维度（1=很低，5=很高）。'
                    : 'Please first specify the AI tool you use most commonly, then answer the following questions based on your use of that tool. Please recall your experience when using that tool for learning. If you cannot recall the specific feelings, you can open that tool now to experience it, then come back to answer the following questions. Based on your actual experience, please rate the following dimensions (1 = Very Low, 5 = Very High).'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="aiTool">
                  <strong>{isZh ? '您最常用的AI工具是什么？（例如：ChatGPT、Claude、GEMINI等）' : 'What is the AI tool you use most commonly? (e.g., ChatGPT, Claude, GEMINI, etc.)'}</strong>
                </label>
                <input
                  id="aiTool"
                  type="text"
                  className="pretest-input"
                  placeholder={isZh ? '请输入AI工具名称，例如：ChatGPT' : 'Please enter the AI tool name, e.g., ChatGPT'}
                  value={form.aiTool || ''}
                  onChange={(e) => handleChange('aiTool', e.target.value)}
                />
                <p style={{ fontSize: '0.9rem', color: '#4a5568', marginTop: '8px', fontStyle: 'italic' }}>
                  {isZh ? '（以下问题请基于该工具的使用来回答）' : '(Please answer the following questions based on your use of this tool)'}
                </p>
              </div>

              {[
                {
                  id: 'q4',
                  text: isZh
                    ? `在使用${form.aiTool || '该AI工具'}进行学习时，我需要投入的心理思考和注意力：`
                    : `When using ${form.aiTool || 'this AI tool'} for learning, the mental effort and attention I needed to invest:`
                },
                {
                  id: 'q5',
                  text: isZh
                    ? `在使用${form.aiTool || '该AI工具'}进行学习时，我需要付出的身体操作和姿势调整：`
                    : `When using ${form.aiTool || 'this AI tool'} for learning, the physical operations and posture adjustments I needed:`
                },
                {
                  id: 'q6',
                  text: isZh
                    ? `在使用${form.aiTool || '该AI工具'}进行学习时，我感受到的时间紧迫感：`
                    : `When using ${form.aiTool || 'this AI tool'} for learning, the time pressure I felt:`
                },
                {
                  id: 'q7',
                  text: isZh
                    ? `在使用${form.aiTool || '该AI工具'}进行学习时，我需要付出的总体努力程度：`
                    : `When using ${form.aiTool || 'this AI tool'} for learning, the overall effort I needed to put in:`
                },
                {
                  id: 'q8',
                  text: isZh
                    ? `在使用${form.aiTool || '该AI工具'}进行学习时，我对自己的表现感到满意的程度：`
                    : `When using ${form.aiTool || 'this AI tool'} for learning, how satisfied I was with my own performance:`
                },
                {
                  id: 'q9',
                  text: isZh
                    ? `在使用${form.aiTool || '该AI工具'}进行学习时，我感受到的挫败、紧张或烦躁程度：`
                    : `When using ${form.aiTool || 'this AI tool'} for learning, the level of frustration, tension, or irritation I felt:`
                }
              ].map(item => (
                <div key={item.id} className="pretest-question">
                  <label><strong>{item.id.toUpperCase()}.</strong> {item.text}</label>
                  <div className="pretest-scale-options">
                    {[
                      { val: 1, label: isZh ? '很低' : 'Very Low' },
                      { val: 2, label: isZh ? '较低' : 'Low' },
                      { val: 3, label: isZh ? '一般' : 'Moderate' },
                      { val: 4, label: isZh ? '较高' : 'High' },
                      { val: 5, label: isZh ? '很高' : 'Very High' }
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
