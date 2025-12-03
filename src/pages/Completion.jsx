import { useNavigate, useLocation } from 'react-router-dom'
import './Completion.css'

function Completion({ language, username }) {
  const navigate = useNavigate()
  const location = useLocation()
  const questionnaireCompleted = location.state?.questionnaireCompleted || false

  return (
    <div className="completion-container">
      <div className="completion-content">
        <h1>{language === 'zh' ? '感谢参与' : 'Thank You for Participating'}</h1>
        <p className="completion-message">
          {questionnaireCompleted 
            ? (language === 'zh' 
                ? '感谢您填写问卷，您的反馈对我们非常重要！'
                : 'Thank you for completing the questionnaire. Your feedback is very important to us!')
            : (language === 'zh' 
                ? '希望学习愉快，请参与我们的测试后问卷调研。'
                : 'Hope you enjoyed learning! Please participate in our post-test questionnaire survey.')}
        </p>
        {!questionnaireCompleted && (
          <div className="completion-buttons">
            <button 
              className="completion-btn completion-posttest-btn"
              onClick={() => navigate('/posttest')}
            >
              {language === 'zh' ? '后测问卷' : 'Post-Test Questionnaire'}
            </button>
            <button 
              className="completion-btn completion-back-btn"
              onClick={() => navigate('/game')}
            >
              {language === 'zh' ? '返回' : 'Back'}
            </button>
          </div>
        )}
        {questionnaireCompleted && (
          <div className="completion-buttons">
            <button 
              className="completion-btn completion-back-btn"
              onClick={() => navigate('/game')}
            >
              {language === 'zh' ? '返回' : 'Back'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Completion

