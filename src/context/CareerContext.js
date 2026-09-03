import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../API/supabaseClient';

const CareerContext = createContext(null);

export function CareerProvider({ children }) {
  const [goal, setGoal] = useState('');
  const [stages, setStages] = useState([]);
  const [checkedByStage, setCheckedByStage] = useState({});
  const [resumeFile, setResumeFile] = useState(null); // transient DocumentPicker asset, local preview only
  const [resumeText, setResumeText] = useState('');
  const [resumeFeedback, setResumeFeedback] = useState(null);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null); // signed URL for re-viewing a saved PDF

  // Supabase bookkeeping — lets toggleTodo/saveRoadmap/saveResumeFeedback know exactly which rows to write to
  const [roadmapId, setRoadmapId] = useState(null);
  const [todoIdsByStage, setTodoIdsByStage] = useState({});
  const [resumeId, setResumeId] = useState(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [loadingResume, setLoadingResume] = useState(true);

  const resetLocalState = () => {
    setGoal('');
    setStages([]);
    setCheckedByStage({});
    setRoadmapId(null);
    setTodoIdsByStage({});
    setResumeFile(null);
    setResumeText('');
    setResumeFeedback(null);
    setResumeSignedUrl(null);
    setResumeId(null);
  };

  // ---------- ROADMAP ----------

  const loadRoadmapForUser = useCallback(async (userId) => {
    setLoadingRoadmap(true);
    try {
      const { data: roadmap, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (roadmapError) throw roadmapError;

      if (!roadmap) {
        setGoal('');
        setStages([]);
        setCheckedByStage({});
        setRoadmapId(null);
        setTodoIdsByStage({});
        return;
      }

      const { data: stageRows, error: stagesError } = await supabase
        .from('stages')
        .select('*')
        .eq('roadmap_id', roadmap.id)
        .order('order_index', { ascending: true });
      if (stagesError) throw stagesError;

      const loadedStages = [];
      const loadedChecked = {};
      const loadedTodoIds = {};

      for (let i = 0; i < stageRows.length; i++) {
        const stageRow = stageRows[i];
        const { data: todoRows, error: todosError } = await supabase
          .from('todos')
          .select('*')
          .eq('stage_id', stageRow.id)
          .order('order_index', { ascending: true });
        if (todosError) throw todosError;

        loadedStages.push({
          title: stageRow.title,
          todos: todoRows.map((t) => t.title),
        });
        loadedChecked[i] = {};
        loadedTodoIds[i] = [];
        todoRows.forEach((t, j) => {
          loadedChecked[i][j] = !!t.completed;
          loadedTodoIds[i].push(t.id);
        });
      }

      setGoal(roadmap.goal);
      setStages(loadedStages);
      setCheckedByStage(loadedChecked);
      setRoadmapId(roadmap.id);
      setTodoIdsByStage(loadedTodoIds);
    } catch (err) {
      console.log('loadRoadmapForUser error:', err.message);
    } finally {
      setLoadingRoadmap(false);
    }
  }, []);

  const toggleTodo = async (stageIndex, todoIndex) => {
    const newValue = !checkedByStage[stageIndex]?.[todoIndex];

    setCheckedByStage((prev) => ({
      ...prev,
      [stageIndex]: {
        ...prev[stageIndex],
        [todoIndex]: newValue,
      },
    }));

    const todoId = todoIdsByStage[stageIndex]?.[todoIndex];
    if (todoId) {
      const { error } = await supabase.from('todos').update({ completed: newValue }).eq('id', todoId);
      if (error) console.log('toggleTodo sync error:', error.message);
    }
  };

  // Local-only state update, used both after a fresh AI generation and after loading from Supabase.
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

  // Persists a freshly-generated roadmap to Supabase (replacing any existing one for this user),
  // then updates local state to match. One roadmap per user, per schema.sql's design.
  const saveRoadmap = async (jobTitle, parsedStages) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No signed-in user to save the roadmap for.');

    const { error: deleteError } = await supabase.from('roadmaps').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;

    const { data: roadmapRow, error: roadmapError } = await supabase
      .from('roadmaps')
      .insert({ user_id: userId, goal: jobTitle })
      .select()
      .single();
    if (roadmapError) throw roadmapError;

    const newTodoIds = {};

    for (let i = 0; i < parsedStages.length; i++) {
      const stage = parsedStages[i];
      const { data: stageRow, error: stageError } = await supabase
        .from('stages')
        .insert({ roadmap_id: roadmapRow.id, title: stage.title, order_index: i })
        .select()
        .single();
      if (stageError) throw stageError;

      newTodoIds[i] = [];
      for (let j = 0; j < stage.todos.length; j++) {
        const isCompleted = !!stage.completedTodos?.includes(j);
        const { data: todoRow, error: todoError } = await supabase
          .from('todos')
          .insert({ stage_id: stageRow.id, title: stage.todos[j], completed: isCompleted, order_index: j })
          .select()
          .single();
        if (todoError) throw todoError;
        newTodoIds[i].push(todoRow.id);
      }
    }

    setRoadmapId(roadmapRow.id);
    setTodoIdsByStage(newTodoIds);
    setGoal(jobTitle);
    applyRoadmap(parsedStages);
  };

  const removeRoadmap = async () => {
    if (roadmapId) {
      const { error } = await supabase.from('roadmaps').delete().eq('id', roadmapId);
      if (error) console.log('removeRoadmap error:', error.message);
    }
    setGoal('');
    setStages([]);
    setCheckedByStage({});
    setRoadmapId(null);
    setTodoIdsByStage({});
  };

  // ---------- RESUME ----------

  const loadResumeForUser = useCallback(async (userId) => {
    setLoadingResume(true);
    try {
      const { data: resumeRow, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (!resumeRow) {
        setResumeId(null);
        setResumeText('');
        setResumeFeedback(null);
        setResumeSignedUrl(null);
        return;
      }

      setResumeId(resumeRow.id);
      setResumeText(resumeRow.extracted_text || '');
      setResumeFeedback(
        resumeRow.match_score != null
          ? { matchScore: resumeRow.match_score, feedback: resumeRow.feedback || [] }
          : null
      );

      if (resumeRow.file_url) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('resumes')
          .createSignedUrl(resumeRow.file_url, 60 * 60); // 1 hour, re-signed on every load
        if (signedUrlError) throw signedUrlError;
        setResumeSignedUrl(signedUrlData.signedUrl);
      } else {
        setResumeSignedUrl(null);
      }
    } catch (err) {
      console.log('loadResumeForUser error:', err.message);
    } finally {
      setLoadingResume(false);
    }
  }, []);

  // Uploads the picked PDF to Storage and saves the extracted text, replacing any previous resume.
  const uploadResume = async (localUri, extractedText) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No signed-in user to save the resume for.');

    const path = `${userId}/resume.pdf`;

    // supabase-js needs raw bytes, not a RN file:// URI — read as base64, then decode to an ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, decode(base64), { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    // one resume per user — clear the old row (feedback becomes stale for a new file anyway)
    const { error: deleteError } = await supabase.from('resumes').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;

    const { data: resumeRow, error: insertError } = await supabase
      .from('resumes')
      .insert({ user_id: userId, file_url: path, extracted_text: extractedText })
      .select()
      .single();
    if (insertError) throw insertError;

    setResumeId(resumeRow.id);
    setResumeText(extractedText);
    setResumeFeedback(null);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(path, 60 * 60);
    if (signedUrlError) throw signedUrlError;
    setResumeSignedUrl(signedUrlData.signedUrl);

    return resumeRow.id;
  };

  const saveResumeFeedback = async (matchScore, feedbackArray) => {
    if (!resumeId) throw new Error('No saved resume to attach feedback to.');
    const { error } = await supabase
      .from('resumes')
      .update({ match_score: matchScore, feedback: feedbackArray })
      .eq('id', resumeId);
    if (error) throw error;
    setResumeFeedback({ matchScore, feedback: feedbackArray });
  };

  const removeResume = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      await supabase.storage.from('resumes').remove([`${userId}/resume.pdf`]);
      const { error } = await supabase.from('resumes').delete().eq('user_id', userId);
      if (error) console.log('removeResume error:', error.message);
    }
    setResumeFile(null);
    setResumeText('');
    setResumeFeedback(null);
    setResumeSignedUrl(null);
    setResumeId(null);
  };

  // ---------- AUTH-DRIVEN LOAD/RESET ----------

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadRoadmapForUser(session.user.id);
        loadResumeForUser(session.user.id);
      } else {
        setLoadingRoadmap(false);
        setLoadingResume(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadRoadmapForUser(session.user.id);
        loadResumeForUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        resetLocalState();
        setLoadingRoadmap(false);
        setLoadingResume(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [loadRoadmapForUser, loadResumeForUser]);

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
    saveRoadmap, loadingRoadmap,
    activeStageIndex, getStageStatus,
    resumeFile, setResumeFile,
    resumeText,
    resumeFeedback,
    resumeSignedUrl,
    loadingResume,
    uploadResume, saveResumeFeedback, removeResume,
  };

  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) throw new Error('useCareer must be used inside CareerProvider');
  return context;
}