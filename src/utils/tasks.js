// Bloom's Taxonomy 6 levels
export const BLOOM_LEVELS = {
  REMEMBER: {
    id: 'remember',
    name: {
      zh: '记忆',
      en: 'Remember'
    },
    description: {
      zh: '回忆和识别信息',
      en: 'Recall and recognize information'
    },
    maxPoints: 10
  },
  UNDERSTAND: {
    id: 'understand',
    name: {
      zh: '理解',
      en: 'Understand'
    },
    description: {
      zh: '理解概念和意义',
      en: 'Understand concepts and meanings'
    },
    maxPoints: 10
  },
  APPLY: {
    id: 'apply',
    name: {
      zh: '应用',
      en: 'Apply'
    },
    description: {
      zh: '应用知识解决问题',
      en: 'Apply knowledge to solve problems'
    },
    maxPoints: 10
  },
  ANALYZE: {
    id: 'analyze',
    name: {
      zh: '分析',
      en: 'Analyze'
    },
    description: {
      zh: '分析信息和结构',
      en: 'Analyze information and structure'
    },
    maxPoints: 10
  },
  EVALUATE: {
    id: 'evaluate',
    name: {
      zh: '评估',
      en: 'Evaluate'
    },
    description: {
      zh: '评估和判断',
      en: 'Evaluate and make judgments'
    },
    maxPoints: 10
  },
  CREATE: {
    id: 'create',
    name: {
      zh: '创造',
      en: 'Create'
    },
    description: {
      zh: '创造新内容',
      en: 'Create new content'
    },
    maxPoints: 10
  }
}

export const getTasksArray = (language) => {
  return Object.values(BLOOM_LEVELS).map(level => ({
    ...level,
    name: level.name[language],
    description: level.description[language],
    points: 0,
    completed: false
  }))
}

