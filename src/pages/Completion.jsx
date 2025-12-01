import { useNavigate } from 'react-router-dom'
import './Completion.css'

function Completion({ language, username }) {
  const navigate = useNavigate()

  return (
    <div className="completion-container">
      <div className="completion-content">
        <h1>{language === 'zh' ? '感谢参与' : 'Thank You for Participating'}</h1>
        <p className="completion-message">
          {language === 'zh' 
            ? '希望学习愉快，请参与我们的测试后问卷调研。'
            : 'Hope you enjoyed learning! Please participate in our post-test questionnaire survey.'}
        </p>
        <button 
          className="completion-back-btn"
          onClick={() => navigate('/game')}
        >
          {language === 'zh' ? '返回' : 'Back'}
        </button>
      </div>
    </div>
  )
}

export default Completion

