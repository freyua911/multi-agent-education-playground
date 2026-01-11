import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Test.css'
import '../styles/PreTest.css'

function PreTest({ language, username }) {
  const navigate = useNavigate()
  const isZh = language === 'zh'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Basic Information - New questions at the beginning
    q0_gender: '', // Gender
    q0_age: '', // Age (text input)
    q0_academicBackground: '', // Academic background (High School, Bachelor, Master, PhD)
    q0_major: '', // Major (text input)
    
    // Basic Information - Original questions
    q1_usedAI: '', // Have you previously used AI-based tools?
    q2_aiPurposes: '', // For what purposes do you usually use AI-based tools? (multiple choice, pipe-separated)
    q2_aiPurposesOther: '', // Other purpose text
    
    // Learning Activity
    q3_learningTopic: '', // What learning topic did you choose?
    q4_priorKnowledge: '', // How would you rate your prior knowledge? (0-5)
    q5_timeSpent: '', // How much time did you spend? (in minutes)
    q6_difficulty: '', // How would you rate the overall difficulty? (1-5)
    q7_effortDirection: '5', // Effort direction slider (0-10, where 0 = (a) and 10 = (b))
    
    // Subjective Workload with NASA-LEX (1-5 scale)
    q8_mentalEffort: '', // Mental effort and attention
    q9_physicalEffort: '', // Physical effort
    q10_timePressure: '', // Time pressure
    q11_overallEffort: '', // Overall effort
    q12_satisfaction: '', // Satisfaction with learning outcome
    q13_frustration: '', // Frustration, tension, or irritation
    
    // Open-ended Questions
    q14_futureInteraction: '', // How should future students and teachers interact with AI?
    q15_aiDisadvantages: '' // Disadvantages of AI compared to human instructors
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Multiple choice: toggle AI purposes (stored as pipe-separated string)
  const toggleAIPurpose = (value) => {
    setForm(prev => {
      const current = (prev.q2_aiPurposes || '').split('|').filter(Boolean)
      const exists = current.includes(value)
      const next = exists ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, q2_aiPurposes: next.join('|') }
    })
  }

  const handleStartGame = async () => {
    // Validate required questions
    const missingFields = []
    
    // Basic Information - New questions
    if (!form.q0_gender) {
      missingFields.push(isZh ? '性别' : 'Gender')
    }
    
    if (!form.q0_age || !form.q0_age.trim()) {
      missingFields.push(isZh ? '年龄' : 'Age')
    }
    
    if (!form.q0_academicBackground) {
      missingFields.push(isZh ? '学术背景' : 'Academic background')
    }
    
    if (!form.q0_major || !form.q0_major.trim()) {
      missingFields.push(isZh ? '专业' : 'Major')
    }
    
    // Basic Information - Original questions
    if (!form.q1_usedAI) {
      missingFields.push(isZh ? '是否使用过AI工具' : 'Have you previously used AI-based tools?')
    }
    
    if (!form.q2_aiPurposes) {
      missingFields.push(isZh ? 'AI工具使用目的' : 'AI tool usage purposes')
    }
    
    // Learning Activity
    if (!form.q3_learningTopic || !form.q3_learningTopic.trim()) {
      missingFields.push(isZh ? '学习主题' : 'Learning topic')
    }
    
    if (form.q4_priorKnowledge === '') {
      missingFields.push(isZh ? '先验知识评分' : 'Prior knowledge rating')
    }
    
    if (!form.q5_timeSpent || !form.q5_timeSpent.trim()) {
      missingFields.push(isZh ? '学习时间' : 'Time spent')
    }
    
    if (!form.q6_difficulty) {
      missingFields.push(isZh ? '难度评分' : 'Difficulty rating')
    }
    
    if (form.q7_effortDirection === '' || form.q7_effortDirection === undefined) {
      missingFields.push(isZh ? '努力方向' : 'Effort direction')
    }
    
    // NASA-LEX questions
    const nasaQuestions = [
      { key: 'q8_mentalEffort', label: isZh ? '心理努力' : 'Mental effort' },
      { key: 'q9_physicalEffort', label: isZh ? '身体努力' : 'Physical effort' },
      { key: 'q10_timePressure', label: isZh ? '时间压力' : 'Time pressure' },
      { key: 'q11_overallEffort', label: isZh ? '总体努力' : 'Overall effort' },
      { key: 'q12_satisfaction', label: isZh ? '满意度' : 'Satisfaction' },
      { key: 'q13_frustration', label: isZh ? '挫败感' : 'Frustration' }
    ]
    
    const missingNASA = nasaQuestions.filter(q => !form[q.key])
    if (missingNASA.length > 0) {
      missingFields.push(isZh ? 'NASA-LEX问题' : 'NASA-LEX questions')
    }
    
    if (missingFields.length > 0) {
      const message = isZh 
        ? `请完成以下必答问题：${missingFields.join('、')}`
        : `Please complete the following required questions: ${missingFields.join(', ')}`
      alert(message)
      return
    }
    
    // All required questions answered, save questionnaire
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
        throw new Error(isZh ? '保存问卷失败，请稍后重试。' : 'Failed to save survey. Please try again later.')
      }
      
      // Save successful, enter classroom
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
          <h1>{isZh ? '背景问卷' : 'Background Survey'}</h1>
          <p>
            {isZh
              ? '在进入Stratux教室前，请先回答以下问题，帮助我们更好的了解你的背景与对AI的了解。'
              : 'Before entering Stratux classroom, please answer these questions so we can better understand your background and understanding of AI.'}
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
              : (isZh ? '开始学习' : 'Start Learning')}
          </button>
        </div>
      </header>

      <div className="test-main pretest-main">
        <form className="pretest-form-wrapper">
          <section className="test-panel pretest-panel pretest-panel-left">
            <div className="test-chat-feed pretest-form">
              <div className="pretest-topic-header">
                <h3>{isZh ? '基本信息' : 'Basic Information'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请提供一些关于您的基本背景信息，这些信息将被记录并用于学术研究，一经完成研究将被完全删除。'
                    : 'Please provide some basic background information about yourself. This information will be recorded and used for academic research, and will be completely deleted upon completion of the research.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? '1. 性别：' : '1. Gender:'}</strong></label>
                <div className="pretest-options pretest-options-horizontal">
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_gender"
                      value="male"
                      checked={form.q0_gender === 'male'}
                      onChange={(e) => handleChange('q0_gender', e.target.value)}
                    />
                    <span>{isZh ? '男' : 'Male'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_gender"
                      value="female"
                      checked={form.q0_gender === 'female'}
                      onChange={(e) => handleChange('q0_gender', e.target.value)}
                    />
                    <span>{isZh ? '女' : 'Female'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_gender"
                      value="other"
                      checked={form.q0_gender === 'other'}
                      onChange={(e) => handleChange('q0_gender', e.target.value)}
                    />
                    <span>{isZh ? '其他' : 'Other'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_gender"
                      value="prefer_not_to_say"
                      checked={form.q0_gender === 'prefer_not_to_say'}
                      onChange={(e) => handleChange('q0_gender', e.target.value)}
                    />
                    <span>{isZh ? '不愿透露' : 'Prefer not to say'}</span>
                  </label>
                </div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q0_age">
                  <strong>{isZh ? '2. 年龄：' : '2. Age:'}</strong>
                </label>
                <input
                  id="q0_age"
                  type="text"
                  className="pretest-input"
                  placeholder={isZh ? '请输入您的年龄' : 'Please enter your age'}
                  value={form.q0_age || ''}
                  onChange={(e) => handleChange('q0_age', e.target.value)}
                />
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? '3. 学术背景：' : '3. Academic Background:'}</strong></label>
                <div className="pretest-options pretest-options-horizontal">
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_academicBackground"
                      value="senior_high_school"
                      checked={form.q0_academicBackground === 'senior_high_school'}
                      onChange={(e) => handleChange('q0_academicBackground', e.target.value)}
                    />
                    <span>{isZh ? '高中' : 'Senior_High School'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_academicBackground"
                      value="bachelor"
                      checked={form.q0_academicBackground === 'bachelor'}
                      onChange={(e) => handleChange('q0_academicBackground', e.target.value)}
                    />
                    <span>{isZh ? '本科' : 'Bachelor'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_academicBackground"
                      value="master"
                      checked={form.q0_academicBackground === 'master'}
                      onChange={(e) => handleChange('q0_academicBackground', e.target.value)}
                    />
                    <span>{isZh ? '研究生' : 'Master'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_academicBackground"
                      value="PhD"
                      checked={form.q0_academicBackground === 'PhD'}
                      onChange={(e) => handleChange('q0_academicBackground', e.target.value)}
                    />
                    <span>{isZh ? '博士' : 'PhD'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q0_academicBackground"
                      value="Other"
                      checked={form.q0_academicBackground === 'Other'}
                      onChange={(e) => handleChange('q0_academicBackground', e.target.value)}
                    />
                    <span>{isZh ? '其它' : 'Other'}</span>
                  </label>
                </div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q0_major">
                  <strong>{isZh ? '4. 专业：' : '4. Major:'}</strong>
                </label>
                <input
                  id="q0_major"
                  type="text"
                  className="pretest-input"
                  placeholder={isZh ? '请输入您的专业' : 'Please enter your major'}
                  value={form.q0_major || ''}
                  onChange={(e) => handleChange('q0_major', e.target.value)}
                />
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? '5. 您之前是否使用过AI工具（例如：ChatGPT、Gemini）？' : '5. Have you previously used AI-based tools (e.g., ChatGPT, Gemini)?'}</strong></label>
                <div className="pretest-options">
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q1_usedAI"
                      value="daily"
                      checked={form.q1_usedAI === 'daily'}
                      onChange={(e) => handleChange('q1_usedAI', e.target.value)}
                    />
                    <span>{isZh ? '每天（每周超过5天）' : 'Daily (more than 5 days per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q1_usedAI"
                      value="frequent"
                      checked={form.q1_usedAI === 'frequent'}
                      onChange={(e) => handleChange('q1_usedAI', e.target.value)}
                    />
                    <span>{isZh ? '经常（每周3-5天）' : 'Frequent (3-5 days per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q1_usedAI"
                      value="occasional"
                      checked={form.q1_usedAI === 'occasional'}
                      onChange={(e) => handleChange('q1_usedAI', e.target.value)}
                    />
                    <span>{isZh ? '偶尔（每周1-2天）' : 'Occasional (1-2 days per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q1_usedAI"
                      value="rare"
                      checked={form.q1_usedAI === 'rare'}
                      onChange={(e) => handleChange('q1_usedAI', e.target.value)}
                    />
                    <span>{isZh ? '很少（每周少于1天）' : 'Rare (less than 1 day per week)'}</span>
                  </label>
                  <label className="pretest-radio-label">
                    <input
                      type="radio"
                      name="q1_usedAI"
                      value="never"
                      checked={form.q1_usedAI === 'never'}
                      onChange={(e) => handleChange('q1_usedAI', e.target.value)}
                    />
                    <span>{isZh ? '从未使用' : 'Never'}</span>
                  </label>
                </div>
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? '6. 您通常出于哪些目的使用AI工具（例如：ChatGPT、Gemini）？（可多选）' : '6. For what purposes do you usually use AI-based tools (e.g., ChatGPT, Gemini)? (Multiple choices allowed)'}</strong></label>
                <div className="pretest-options pretest-options-column">
                  {[
                    {
                      value: 'learning',
                      labelZh: '学习知识 / 完成课程相关任务',
                      labelEn: 'Learning knowledge / completing course-related tasks'
                    },
                    {
                      value: 'work',
                      labelZh: '工作或科研相关任务',
                      labelEn: 'Work or research-related tasks'
                    },
                    {
                      value: 'creative',
                      labelZh: '创作内容（写作、设计等）',
                      labelEn: 'Creative content (writing, design, etc.)'
                    },
                    {
                      value: 'coding',
                      labelZh: '编程或技术问题',
                      labelEn: 'Programming or technical problems'
                    },
                    {
                      value: 'entertainment',
                      labelZh: '日常聊天 / 消遣娱乐',
                      labelEn: 'Casual chatting / entertainment'
                    },
                    {
                      value: 'other',
                      labelZh: '其他',
                      labelEn: 'Other'
                    }
                  ].map(option => {
                    const selected = (form.q2_aiPurposes || '').split('|').filter(Boolean)
                    const checked = selected.includes(option.value)
                    return (
                      <label key={option.value} className="pretest-checkbox-label">
                        <input
                          type="checkbox"
                          name="q2_aiPurposes"
                          value={option.value}
                          checked={checked}
                          onChange={() => toggleAIPurpose(option.value)}
                        />
                        <span>{isZh ? option.labelZh : option.labelEn}</span>
                      </label>
                    )
                  })}
                  {/* Other + text input */}
                  {(() => {
                    const selected = (form.q2_aiPurposes || '').split('|').filter(Boolean)
                    const checked = selected.includes('other')
                    return (
                      <div className="pretest-checkbox-other">
                        <input
                          type="text"
                          className="pretest-input pretest-input-other"
                          placeholder={isZh ? '请说明其他目的' : 'Please specify other purposes'}
                          value={form.q2_aiPurposesOther || ''}
                          onChange={(e) => handleChange('q2_aiPurposesOther', e.target.value)}
                          disabled={!checked}
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
                <h3>{isZh ? '学习体验' : 'Learning Experience'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? (
                      <>
                        现在，请你打开
                        <a 
                          href="https://chat.deepseek.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#805ad5', textDecoration: 'underline' }}
                        >
                          deepseek
                        </a>
                        的界面，并选择一个你感兴趣的学习主题进行学习，请保证至少学习10分钟后再回答以下问题。
                      </>
                    )
                    : (
                      <>
                        Now, please open the{' '}
                        <a 
                          href="https://chat.deepseek.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#805ad5', textDecoration: 'underline' }}
                        >
                          deepseek
                        </a>
                        {' '} conversatoinal interface and select a learning topic you are interested in. Please ensure that you have learned for at least 10 minutes before answering the following questions.
                      </>
                    )}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q3_learningTopic">
                  <strong>{isZh ? '1. 您在使用DeepSeek时选择了什么学习主题？' : '1. What learning topic did you choose when using DeepSeek?'}</strong>
                </label>
                <input
                  id="q3_learningTopic"
                  type="text"
                  className="pretest-input"
                  placeholder={isZh ? '请输入学习主题' : 'Please enter the learning topic'}
                  value={form.q3_learningTopic || ''}
                  onChange={(e) => handleChange('q3_learningTopic', e.target.value)}
                />
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? '2. 您如何评价您对这个主题的先验知识？' : '2. How would you rate your prior knowledge of this topic?'}</strong></label>
                <div className="pretest-scale-options pretest-scale-options-vertical">
                  {[
                    { val: 0, label: isZh ? '没有先验知识' : 'No prior knowledge' },
                    { val: 1, label: isZh ? '听说过但只知道几个基本术语' : 'I have heard of the topic but only know a few basic terms' },
                    { val: 2, label: isZh ? '理解基本概念但无法详细解释' : 'I understand the basic concepts but cannot explain them in detail' },
                    { val: 3, label: isZh ? '可以将基本概念应用到简单示例或任务' : 'I can apply the basic concepts to simple examples or tasks' },
                    { val: 4, label: isZh ? '可以分析相关问题并比较不同方法' : 'I can analyze problems related to this topic and compare different approaches' },
                    { val: 5, label: isZh ? '具有高级知识，可以批判性评估或扩展该主题的想法' : 'I have advanced knowledge and can critically evaluate or extend ideas in this topic' }
                  ].map(({ val, label }) => (
                    <label key={val} className="pretest-scale-option">
                      <input
                        type="radio"
                        name="q4_priorKnowledge"
                        value={String(val)}
                        checked={form.q4_priorKnowledge === String(val)}
                        onChange={(e) => handleChange('q4_priorKnowledge', e.target.value)}
                />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q5_timeSpent">
                  <strong>{isZh ? '3. 您在这次会话中花费了多少时间学习这个主题？（单位：分钟）' : '3. How much time did you spend on this learning topic during this session? (in minutes)'}</strong>
                </label>
                <input
                  id="q5_timeSpent"
                  type="number"
                  min="0"
                  className="pretest-input"
                  placeholder={isZh ? '请输入分钟数' : 'Please enter minutes'}
                  value={form.q5_timeSpent || ''}
                  onChange={(e) => handleChange('q5_timeSpent', e.target.value)}
                />
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? '4. 在您的观点中，您如何评价这个学习主题的整体难度？' : '4. In your perspective, how would you rate the overall difficulty of this learning topic?'}</strong></label>
                <div className="pretest-scale-options">
                  {[
                    { val: 1, label: isZh ? '非常简单' : 'Very Easy' },
                    { val: 2, label: isZh ? '简单' : 'Easy' },
                    { val: 3, label: isZh ? '一般' : 'Moderate' },
                    { val: 4, label: isZh ? '困难' : 'Difficult' },
                    { val: 5, label: isZh ? '非常困难' : 'Very Difficult' }
                  ].map(({ val, label }) => (
                    <label key={val} className="pretest-scale-option">
                      <input
                        type="radio"
                        name="q6_difficulty"
                        value={String(val)}
                        checked={form.q6_difficulty === String(val)}
                        onChange={(e) => handleChange('q6_difficulty', e.target.value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pretest-question">
                <label><strong>{isZh ? '5. 在您的体验中，与AI交互所花费的努力是倾向于（a）主动思考和完成任务，还是（b）费力地试图理解和猜测AI的意图和答案？' : '5. In your experience, the effort spent interacting with AI is directed towards (a) proactively thinking and completing tasks, or (b) towards painstakingly trying to understand and guess the AI\'s intentions and answers.'}</strong></label>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <span>{isZh ? '(0) 主动思考和完成任务' : '(0) Proactively thinking and completing tasks'}</span>
                    <span>{isZh ? '(10) 费力理解AI的意图' : '(10) Painstakingly trying to understand AI'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={form.q7_effortDirection || 5}
                    onChange={(e) => handleChange('q7_effortDirection', e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              <div className="pretest-topic-header">
                <h3>{isZh ? '主观工作负荷感知（NASA-LEX）' : 'Subjective Workload with NASA-LEX'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请基于你使用DeepSeek学习时的体验，评估你使用时主观的感受：'
                    : 'The following items were adapted from the NASA Task Load Index (NASA-TLX). Participants rated each item on a 5-point Likert scale (1 = Very Low, 5 = Very High).'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              {[
                {
                  id: 'q8_mentalEffort',
                  num: 1,
                  text: isZh
                    ? '在使用DeepSeek进行学习时，您需要投入多少心理努力和注意力？'
                    : 'When using AI for learning, how much mental effort and attention did you need to invest?'
                },
                {
                  id: 'q9_physicalEffort',
                  num: 2,
                  text: isZh
                    ? '在使用DeepSeek进行学习时，您经历了多少身体努力（例如：操作或姿势调整）？'
                    : 'When using AI for learning, how much physical effort (e.g., operations or posture adjustments) did you experience?'
                },
                {
                  id: 'q10_timePressure',
                  num: 3,
                  text: isZh
                    ? '在使用DeepSeek进行学习时，您感受到多少时间压力？'
                    : 'When using AI for learning, how much time pressure did you feel?'
                },
                {
                  id: 'q11_overallEffort',
                  num: 4,
                  text: isZh
                    ? '在使用DeepSeek进行学习时，您需要付出多少总体努力？'
                    : 'When using AI for learning, how much overall effort did you need to put in?'
                },
                {
                  id: 'q12_satisfaction',
                  num: 5,
                  text: isZh
                    ? '在使用DeepSeek进行学习时，您对自己的学习成果有多满意？'
                    : 'When using AI for learning, how satisfied were you with your own learning outcome?'
                },
                {
                  id: 'q13_frustration',
                  num: 6,
                  text: isZh
                    ? '在使用DeepSeek进行学习时，您经历了多少挫败、紧张或烦躁？'
                    : 'When using AI for learning, how much frustration, tension, or irritation did you experience?'
                }
              ].map(item => (
                <div key={item.id} className="pretest-question">
                  <label><strong>{item.num}.</strong> {item.text}</label>
                  <div className="pretest-scale-options">
                    {[
                      { val: 1, label: isZh ? '非常低' : 'Very Low' },
                      { val: 2, label: isZh ? '低' : 'Low' },
                      { val: 3, label: isZh ? '中等' : 'Moderate' },
                      { val: 4, label: isZh ? '高' : 'High' },
                      { val: 5, label: isZh ? '非常高' : 'Very High' }
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
                <h3>{isZh ? '开放性问题' : 'Open-ended Questions'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请分享您对以下问题的看法。'
                    : 'Please share your thoughts on the following questions.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q14_futureInteraction">
                  <strong>{isZh ? '1. 从您的角度来看，未来的学生和老师应该如何与教育环境中的AI系统交互？' : '1. From your perspective, how should future students and teachers interact with AI-based systems in educational contexts?'}</strong>
                </label>
                <textarea
                  id="q14_futureInteraction"
                  className="pretest-textarea"
                  value={form.q14_futureInteraction}
                  onChange={(e) => handleChange('q14_futureInteraction', e.target.value)}
                  rows={4}
                  placeholder={isZh ? '请输入您的回答' : 'Please enter your answer'}
                />
              </div>

              <div className="pretest-question">
                <label htmlFor="q15_aiDisadvantages">
                  <strong>{isZh ? '2. 您认为AI与人类教师相比有哪些劣势？这些劣势如何影响AI在教育中的作用？' : '2. What do you consider to be the disadvantages of AI compared to human instructors, and how do these disadvantages affect AI\'s role in education?'}</strong>
                </label>
                <textarea
                  id="q15_aiDisadvantages"
                  className="pretest-textarea"
                  value={form.q15_aiDisadvantages}
                  onChange={(e) => handleChange('q15_aiDisadvantages', e.target.value)}
                  rows={4}
                  placeholder={isZh ? '请输入您的回答' : 'Please enter your answer'}
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
