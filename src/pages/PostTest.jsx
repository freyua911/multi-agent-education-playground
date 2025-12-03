import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Test.css'
import './PostTest.css'

function PostTest({ language, username }) {
  const navigate = useNavigate()
  const isZh = language === 'zh'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    q1: '', q2: '', q3: '', q4: '', q5: '',
    q6: '', q7: '', q8: '', q9: '', q10: '', q11: '', q12: '',
    q13: '', q14: '', q15: '', q16: '', q17: '',
    q18: '', q19: '', q20: '',
    q21: '', q22: '', q23: '', q24: '', q25: ''
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // 检查必答问题（Q1-Q20是必答的，Q21-Q24是开放性问题可选）
    const missingFields = []
    
    const requiredQuestions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18', 'q19', 'q20']
    const missingQuestions = requiredQuestions.filter(q => !form[q])
    
    if (missingQuestions.length > 0) {
      missingFields.push(isZh ? '部分问题未完成' : 'Some questions are incomplete')
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
      const response = await fetch('/api/save-posttest', {
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
        console.error('Failed to save posttest:', text)
        throw new Error(isZh ? '保存问卷失败，请稍后重试。' : 'Failed to save questionnaire. Please try again later.')
      }
      
      // 保存成功，导航到完成页面，并传递已完成问卷的状态
      navigate('/completion', { state: { questionnaireCompleted: true } })
    } catch (err) {
      console.error('PostTest submit error:', err)
      setError(err.message || (isZh ? '提交失败，请稍后重试。' : 'Submit failed. Please try again.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="test-container posttest-container">
      <header className="test-top-bar">
        <div>
          <h1>{isZh ? '后测问卷' : 'Post-Test Questionnaire'}</h1>
          <p>
            {isZh
              ? '感谢您完成Stratux游戏体验，请回答以下问题，帮助我们了解您的体验和感受。'
              : 'Thank you for completing your Stratux experience. Please answer the following questions to help us understand your experience and feedback.'}
          </p>
        </div>
        <div className="test-top-actions">
          <button 
            className="test-end-btn" 
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting 
              ? (isZh ? '提交中…' : 'Submitting…')
              : (isZh ? '提交问卷' : 'Submit Questionnaire')}
          </button>
        </div>
      </header>

      <div className="test-main pretest-main">
        <form className="pretest-form-wrapper">
          <section className="test-panel pretest-panel pretest-panel-left">
            <div className="test-chat-feed pretest-form">
              <div className="pretest-topic-header">
                <h3>{isZh ? '1. 整体游戏体验' : '1. Overall Game Experience'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '（1-5分：1=非常不同意，5=非常同意）'
                    : '(1–5 points: 1 = Strongly Disagree, 5 = Strongly Agree)'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              {[
          
                { 
                  id: 'q1', 
                  text: isZh 
                    ? '在游戏过程中，我自然而然地想要继续与对方对话，并尝试回答问题。' 
                    : 'During the game, I was naturally inclined to keep dialoguing with the AI and trying to answer the questions.' 
                },
                { 
                  id: 'q2', 
                  text: isZh 
                    ? '在游戏测试中，我感到挑战适中且反馈足够精确有效，能够帮我认识到当前学习的优势和不足。' 
                    : 'In the game-based test, I felt the challenges were appropriate and the feedback precise and effective, helping me notice gaps in my learning.' 
                },
                { 
                  id: 'q3', 
                  text: isZh 
                    ? '游戏流程和结构清晰易懂，体验中我不会感到过度的迷惑和不知所措。' 
                    : 'The game flow and structure were clear and easy to follow; I did not feel excessively confused or lost during the experience.' 
                },
                { 
                  id: 'q4', 
                  text: isZh 
                    ? '相较于常规的AI大模型，我愿意在未来继续使用这样类似的AI课堂游戏进行学习。' 
                    : 'Compared with using general AI models, I am more willing to continue using this kind of AI classroom game for learning in the future.' 
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
                <h3>
                  {isZh
                    ? '2. 对AI角色与教育应用的理解与态度'
                    : '2. Understanding and Attitudes Towards AI Roles and AI in Education'}
                </h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '（1-5分：1=非常不同意，5=非常同意）'
                    : '(1–5 points: 1 = Strongly Disagree, 5 = Strongly Agree)'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              {[
                { 
                  id: 'q13', 
                  text: isZh 
                    ? '在这次体验中，我更好地理解了AI在教学中的不同角色。' 
                    : 'After this experience, I better understand the different roles AI can play in teaching.' 
                },
                { 
                  id: 'q14', 
                  text: isZh 
                    ? '这次体验让我更接受AI可以辅助分层（例如，Bloom的六个层级）学习和评估的想法。' 
                    : 'This experience made me more receptive to the idea that AI can assist in hierarchical (e.g., Bloom\'s six levels) learning and assessment.' 
                },
                { 
                  id: 'q15', 
                  text: isZh 
                    ? '我觉得AI生成的反馈和分数有一定的可信度。' 
                    : 'I feel the feedback and scores generated by the AI are somewhat credible.' 
                },
                { 
                  id: 'q16', 
                  text: isZh 
                    ? '通过这个游戏，我对AI在教育中的潜力有了新的认识。' 
                    : 'Through this game, I gained new insights into the potential of AI in education.' 
                },
                { 
                  id: 'q17', 
                  text: isZh 
                    ? '这次体验让我更愿意在未来尝试使用AI来辅助我的学习。' 
                    : 'This experience made me more willing to try using AI to assist my learning in the future.' 
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

              {[
                { 
                  id: 'q18', 
                  text: isZh 
                    ? '通过与AI对话、回答问题以及接受评估，我更清楚地了解了自己在哪些层级（记忆、理解、应用、分析、评价、创造）表现良好。' 
                    : 'Through dialoguing with AI, answering questions, and being assessed, I gained a clearer understanding of the levels (Remembering, Understanding, Applying, Analyzing, Evaluating, Creating) where I performed well.' 
                },
                { 
                  id: 'q19', 
                  text: isZh 
                    ? '反馈中提到的"未掌握的知识点或需要改进的方面"为我后续的学习提供了具体帮助。' 
                    : 'The "uncovered knowledge points or aspects needing improvement" mentioned in the feedback provided concrete help for my subsequent learning.' 
                },
                { 
                  id: 'q20', 
                  text: isZh 
                    ? '在这个系统中，我感到我的想法得到了认真对待和仔细分析。' 
                    : 'In this system, I felt my ideas were taken seriously and analyzed carefully.' 
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
            </div>
          </section>

          <section className="test-panel pretest-panel pretest-panel-right">
            <div className="test-chat-feed pretest-form">
              <div className="pretest-topic-header">
                <h3>
                  {isZh
                    ? '2. 不同AI角色和环境差异的体验（续）'
                    : '2. Experience with Different AI Roles and Environmental Differences (continued)'}
                </h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '（1-5分：1=非常不同意，5=非常同意）'
                    : '(1–5 points: 1 = Strongly Disagree, 5 = Strongly Agree)'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              {[
                { 
                  id: 'q6', 
                  text: isZh 
                    ? '我能够清楚地区分不同AI角色（教师、同伴、考官、评估者）的功能差异。' 
                    : 'I could clearly distinguish the functional differences between the various AI roles (Teacher, Peer, Examiner, Assessor).' 
                },
                { 
                  id: 'q7', 
                  text: isZh 
                    ? '"AI教师"让我感觉更像是在解释概念和回答我的问题。' 
                    : 'The "AI Teacher" felt more like it was explaining concepts and answering my questions.' 
                },
                { 
                  id: 'q8', 
                  text: isZh 
                    ? '"AI同伴"让我感觉更像是在与我讨论，提出新想法或问题。' 
                    : 'The "AI Peer" felt more like it was discussing with me, raising new ideas or questions.' 
                },
                { 
                  id: 'q9', 
                  text: isZh 
                    ? '"AI考官"提出的问题让我意识到我在哪些层级（例如，记忆、理解、应用）需要更多努力。' 
                    : 'The questions from the "AI Examiner" made me aware of the levels (e.g., Remembering, Understanding, Applying) where I need more effort.' 
                },
                { 
                  id: 'q10', 
                  text: isZh 
                    ? '三位"评估者"和"反馈智能体"提供的评分和总结有助于我了解自己的学习状态。' 
                    : 'The ratings and summaries provided by the three "Assessors" and the "Feedback Agent" were helpful for me to understand my own learning status.' 
                },
                { 
                  id: 'q11', 
                  text: isZh 
                    ? '我能够将"课堂对话"和"测试阶段"视为两个不同但相关的学习环境。' 
                    : 'I could perceive the "Classroom Dialogue" and the "Testing Phase" as two distinct yet related learning environments.' 
                },
                { 
                  id: 'q12', 
                  text: isZh 
                    ? '这种多角色、多面板的环境没有让我感到过度困惑或负担。' 
                    : 'This multi-role, multi-panel environment did not make me feel overly confused or burdened.' 
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
                <h3>{isZh ? '4. 关于 Bloom’s taxonomy 的体验与看法' : '4. Bloom’s Taxonomy Experience and Reflections'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请用您自己的话回答以下关于Bloom认知层级提问方式的思考。'
                    : 'Please answer the following questions about Bloom’s taxonomy and the questioning approach in your own words.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q21">
                  <strong>{isZh ? 'Q21.' : 'Q21.'}</strong>{' '}
                  {isZh
                    ? '在这次体验中，系统中的提问是从“记忆”逐渐走向“创造”。您如何评价这种提问方式？它是否有效地考察了您对不同知识层级的掌握情况？'
                    : 'In this experience, the questions progressed from \"remembering\" to \"creating.\" How do you evaluate this questioning approach? Does it effectively test your mastery of different levels of knowledge?'}
                </label>
                <textarea
                  id="q21"
                  className="pretest-textarea"
                  value={form.q21}
                  onChange={(e) => handleChange('q21', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pretest-question">
                <label htmlFor="q22">
                  <strong>{isZh ? 'Q22.' : 'Q22.'}</strong>{' '}
                  {isZh
                    ? '当您回答错误或不完整时，AI更倾向于直接给出答案，还是通过提示和追问引导您自己发现？您认为哪种方式对真正的“学习”更有帮助？'
                    : 'When you answered incorrectly or incompletely, did the AI tend to give you the answer directly, or guide you with hints and follow-up questions to discover it yourself? Which approach do you think is more helpful for true \"learning\"?'}
                </label>
                <textarea
                  id="q22"
                  className="pretest-textarea"
                  value={form.q22}
                  onChange={(e) => handleChange('q22', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pretest-question">
                <label htmlFor="q23">
                  <strong>{isZh ? 'Q23.' : 'Q23.'}</strong>{' '}
                  {isZh
                    ? '在与AI的多轮对话和分层提问中，您觉得在哪一个阶段AI对您“思考和作答”的帮助最大？请简要说明原因。'
                    : 'Across the multi-round dialogue and hierarchical questioning, at which stage did you find the AI most helpful in supporting your thinking and responses? Please briefly explain why.'}
                </label>
                <textarea
                  id="q23"
                  className="pretest-textarea"
                  value={form.q23}
                  onChange={(e) => handleChange('q23', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pretest-topic-header">
                <h3>{isZh ? '5. 开放性问题（后测）' : '5. Open-ended Questions (Post-Test)'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请用您自己的话回答以下问题。'
                    : 'Please answer the following questions in your own words.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q24">
                  <strong>{isZh ? 'Q24.' : 'Q24.'}</strong>{' '}
                  {isZh
                    ? '经过这次体验，您对\"AI在教育中的优势和风险\"有什么新的思考？请提供1-2个具体例子。'
                    : 'After this experience, what are your new thoughts on \"the advantages and risks of AI in education\"? Please provide 1–2 specific examples.'}
                </label>
                <textarea
                  id="q24"
                  className="pretest-textarea"
                  value={form.q24}
                  onChange={(e) => handleChange('q24', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pretest-question">
                <label htmlFor="q25">
                  <strong>{isZh ? 'Q25.' : 'Q25.'}</strong>{' '}
                  {isZh
                    ? '您还有其他补充的意见、建议或想法想对本次系统设计和体验提出吗？'
                    : 'Do you have any additional comments, suggestions, or feedback about the design and your experience with this system?'}
                </label>
                <textarea
                  id="q25"
                  className="pretest-textarea"
                  value={form.q25}
                  onChange={(e) => handleChange('q25', e.target.value)}
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

export default PostTest
