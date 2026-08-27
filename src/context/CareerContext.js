import { createContext, useContext, useState } from 'react';

const CareerContext = createContext(null);

export function CareerProvider({ children }) {
  const [goal, setGoal] = useState('');
  const [stages, setStages] = useState([]);
  const [checkedByStage, setCheckedByStage] = useState({}); // { [stageIndex]: { [todoIndex]: bool } }

  const toggleTodo = (stageIndex, todoIndex) => {
    setCheckedByStage((prev) => ({
      ...prev,
      [stageIndex]: {
        ...prev[stageIndex],
        [todoIndex]: !prev[stageIndex]?.[todoIndex],
      },
    }));
  };

  const removeRoadmap = () => {
    setGoal('');
    setStages([]);
    setCheckedByStage({});
  };

  return (
    <CareerContext.Provider
      value={{ goal, setGoal, stages, setStages, checkedByStage, toggleTodo, removeRoadmap }}
    >
      {children}
    </CareerContext.Provider>
  );
}

export function useCareer() {
  const ctx = useContext(CareerContext);
  if (!ctx) throw new Error('useCareer must be used within a CareerProvider');
  return ctx;
}