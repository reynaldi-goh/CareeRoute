import { createContext, useContext, useState, useMemo } from 'react';

const CareerContext = createContext(null);

export function CareerProvider({ children }) {
  const [goal, setGoal] = useState('');
  const [stages, setStages] = useState([]);
  const [checkedByStage, setCheckedByStage] = useState({});
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeFeedback, setResumeFeedback] = useState(null);

  const toggleTodo = (stageIndex, todoIndex) => {
    setCheckedByStage((prev) => ({
      ...prev,
      [stageIndex]: {
        ...prev[stageIndex],
        [todoIndex]: !prev[stageIndex]?.[todoIndex],
      },
    }));
  };

  const applyRoadmap = (parsedStages) => {
    setStages(parsedStages);
    const initialChecked = {};
    parsedStages.forEach((stage, i) => {
      initialChecked[i] = {};
      stage.todos.forEach((_, j) => {
        initialChecked[i][j] = !!stage.completedTodos?.includes(j);
      });
    });
    setCheckedByStage(initialChecked);
  };

  const removeRoadmap = () => {
    setGoal('');
    setStages([]);
    setCheckedByStage({});
  };

  // single source of truth: which stage is "current" across the whole app
  const activeStageIndex = useMemo(() => {
    if (stages.length === 0) return -1;
    const firstIncomplete = stages.findIndex((stage, i) => {
      const checked = checkedByStage[i] || {};
      return stage.todos.some((_, j) => !checked[j]);
    });
    return firstIncomplete === -1 ? stages.length - 1 : firstIncomplete;
  }, [stages, checkedByStage]);

  const getStageStatus = (stageIndex) => {
    if (stageIndex < activeStageIndex) return 'done';
    if (stageIndex === activeStageIndex) return 'current';
    return 'upcoming';
  };

  const value = {
    goal, setGoal,
    stages,
    checkedByStage, toggleTodo, applyRoadmap, removeRoadmap,
    activeStageIndex, getStageStatus,
    resumeFile, setResumeFile,
    resumeText, setResumeText,
    resumeFeedback, setResumeFeedback,
  };

  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) throw new Error('useCareer must be used inside CareerProvider');
  return context;
}