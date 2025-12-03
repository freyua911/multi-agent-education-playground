import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Test.css'
import './PostTest.css'

function PostTest({ language, username }) {
  const navigate = useNavigate()
  const isZh = language === 'zh'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 重新编号：Q1-Q4, Q5-Q10, Q11-Q15, Q16-Q17, Q18
  const [form, setForm] = useState({
    q1: '', q2: '', q3: '', q4: '', 
    q5: '', q6: '', q7: '', q8: '', q9: '', q10: '',
    q11: '', q12: '',
    q13: '', q14: '', q15: '',
    q16: '', q17: '',
    q18: ''
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // 检查必答问题（Q1-Q15是必答的，Q16-Q18是开放性问题可选）
    const missingFields = []
    
    const requiredQuestions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15']
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
    <div className={`test-container posttest-container ${!isZh ? 'lang-en' : ''}`} lang={language}>
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
                    ? '在游戏过程中，我能够理解AI生成的内容并且想要继续与对方对话和交流。' 
                    : 'During the game, I was naturally inclined to keep dialoguing with the AI and trying to answer the questions.' 
                },
                { 
                  id: 'q2', 
                  text: isZh 
                    ? '在游戏测试中，我感到挑战适中且反馈足够精确有效，能够帮我认识到当前自己的优势和不足。' 
                    : 'In the game-based test, I felt the challenges were appropriate and the feedback precise and effective, helping me notice gaps in my learning.' 
                },
                { 
                  id: 'q3', 
                  text: isZh 
                    ? '游戏流程和结构清晰流畅，体验中我不会感到过度的迷惑和不知所措。' 
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
                    ? '2. 不同AI角色和环境差异的体验'
                    : '2. Experience with Different AI Roles and Environmental Differences'}
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
                  id: 'q5', 
                  text: isZh 
                    ? '我能够清楚地区分不同AI角色（教师、同伴、考官、评估者）的功能差异。' 
                    : 'I could clearly distinguish the functional differences between the various AI roles (Teacher, Peer, Examiner, Assessor).' 
                },
                { 
                  id: 'q6', 
                  text: isZh 
                    ? '"AI教师"让我感觉更像是在解释概念和回答我的问题。' 
                    : 'The "AI Teacher" felt more like it was explaining concepts and answering my questions.' 
                },
                { 
                  id: 'q7', 
                  text: isZh 
                    ? '"AI同伴"让我感觉更像是在与我讨论，提出新想法或问题。' 
                    : 'The "AI Peer" felt more like it was discussing with me, raising new ideas or questions.' 
                },
                { 
                  id: 'q8', 
                  text: isZh 
                    ? '"考官"在每一个层级（例如，记忆、理解、应用）提出的问题都合理并且符合我的学习诉求与方向。' 
                    : 'The questions from the "Examiner" made me aware of the levels (e.g., Remembering, Understanding, Applying) where I need more effort.' 
                },
                { 
                  id: 'q9', 
                  text: isZh 
                    ? '三位"评估者"提供的评分和反馈总结有助于我了解自己的学习情况并且补充学习新的知识点。' 
                    : 'The ratings and feedback summaries provided by the three "Assessors" helped me understand my learning status and supplement new knowledge points.' 
                },
                { 
                  id: 'q10', 
                  text: isZh 
                    ? '我倾向于与老师角色进行交流，相较于与同伴角色的交流。' 
                    : 'I tend to communicate more with the teacher role compared to the peer role.' 
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
                    ? '3. 对AI辅助的教育应用的理解与态度'
                    : '3. Understanding and Attitudes Towards AI in Education'}
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
                  id: 'q11', 
                  text: isZh 
                    ? '我认为这种与不同AI角色进行对话的学习体验比真实的课堂体验更好。' 
                    : 'I believe this learning experience of dialoguing with different AI roles is better than real classroom experience.' 
                },
                { 
                  id: 'q12', 
                  text: isZh 
                    ? '我认为这种与不同AI角色进行对话的体验比我自己学习更好。' 
                    : 'I believe this experience of dialoguing with different AI roles is better than studying on my own.' 
                },
                { 
                  id: 'q13', 
                  text: isZh 
                    ? '在测试过程中，我觉得AI生成的问题、反馈和分数是合理且可信的。' 
                    : 'I feel the questions, feedback and scores generated by the AI are reasonable and credible.' 
                },
                { 
                  id: 'q14', 
                  text: isZh 
                    ? '我在整个过程中发现了AI的幻觉（指AI在回答时出现不符合事实的回答）或者上下文错误等问题，这些AI存在的问题会降低我对AI的信任度。' 
                    : 'During this process, I noticed AI hallucinations (incorrect or factually inaccurate responses) or contextual errors, and these AI issues reduced my trust in AI.' 
                },
                { 
                  id: 'q15', 
                  text: isZh 
                    ? '我认为思维导图能够帮我更好的检查和概览我学习到的知识。' 
                    : 'I believe the mind map helped me better review and overview the knowledge I learned.' 
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
                <h3>{isZh ? '4. 关于 Bloom\'s taxonomy 的体验与看法' : '4. Bloom\'s Taxonomy Experience and Reflections'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '你认为AI辅助学习对你解答哪个层级的问题最有帮助？为什么你能如此的容易的解答这个层级的问题呢？'
                    : 'Which level of Bloom\'s taxonomy do you think AI-assisted learning was most helpful for answering? Why were you able to answer questions at this level so easily?'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q16">
                  <strong>{isZh ? 'Q16.' : 'Q16.'}</strong>{' '}
                  {isZh
                    ? '你认为AI辅助学习对你解答哪个层级的问题最没有用？为什么你难以解答这个层级的问题呢？'
                    : 'Which level of Bloom\'s taxonomy do you think AI-assisted learning was least helpful for answering? Why did you find it difficult to answer questions at this level?'}
                </label>
                <textarea
                  id="q16"
                  className="pretest-textarea"
                  value={form.q16}
                  onChange={(e) => handleChange('q16', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pretest-question">
                <label htmlFor="q17">
                  <strong>{isZh ? 'Q17.' : 'Q17.'}</strong>{' '}
                  {isZh
                    ? '您觉得那个AI角色对你的学习帮助最大？它还能如何改进呢？'
                    : 'Which AI role do you think was most helpful for your learning? How can it be improved?'}
                </label>
                <textarea
                  id="q17"
                  className="pretest-textarea"
                  value={form.q17}
                  onChange={(e) => handleChange('q17', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pretest-topic-header">
                <h3>{isZh ? '5. 开放性问题' : '5. Open-ended Questions'}</h3>
                <p className="pretest-topic-intro">
                  {isZh
                    ? '请分享您的其他建议或想法。'
                    : 'Please share any additional suggestions or thoughts.'}
                </p>
                <div className="pretest-topic-divider"></div>
              </div>

              <div className="pretest-question">
                <label htmlFor="q18">
                  <strong>{isZh ? 'Q18.' : 'Q18.'}</strong>{' '}
                  {isZh
                    ? '您还有其他补充的意见、建议或想法想对本次系统设计和体验提出吗？'
                    : 'Do you have any additional comments, suggestions, or feedback about the design and your experience with this system?'}
                </label>
                <textarea
                  id="q18"
                  className="pretest-textarea"
                  value={form.q18}
                  onChange={(e) => handleChange('q18', e.target.value)}
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
