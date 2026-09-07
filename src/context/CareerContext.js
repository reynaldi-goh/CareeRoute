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

  // track Supabase row ids (link local state back to the right DB rows on save/update)
  const [roadmapId, setRoadmapId] = useState(null);
  const [todoIdsByStage, setTodoIdsByStage] = useState({});
  const [resumeId, setResumeId] = useState(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [loadingResume, setLoadingResume] = useState(true);

  // clear all local state (run on sign-out, so no stale data survives to the next user)
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

  // fetch roadmap (load the signed-in user's most recent roadmap, stages, and todos from Supabase)
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

      // clear state (user has no roadmap yet)
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

      // fetch todos (per stage, since todos are a separate table keyed by stage_id)
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

  // toggle todo (flip a single todo's completed state locally, then sync it to Supabase)
  const toggleTodo = async (stageIndex, todoIndex) => {
    const newValue = !checkedByStage[stageIndex]?.[todoIndex];

    // update local state (optimistic — reflects instantly, doesn't wait for the DB write)
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

  // apply roadmap (update local stages/checked state only — used after a fresh AI
  // generation and after loading from Supabase, so both paths share one code path)
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

  // save roadmap (persist a freshly-generated roadmap to Supabase, replacing any
  // existing one for this user — schema only allows one roadmap per user)
  const saveRoadmap = async (jobTitle, parsedStages) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No signed-in user to save the roadmap for.');

    // delete old roadmap (cascades to its stages/todos, per schema.sql's FK setup)
    const { error: deleteError } = await supabase.from('roadmaps').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;

    const { data: roadmapRow, error: roadmapError } = await supabase
      .from('roadmaps')
      .insert({ user_id: userId, goal: jobTitle })
      .select()
      .single();
    if (roadmapError) throw roadmapError;

    const newTodoIds = {};

    // insert stages and todos (one DB round-trip per row, since each insert
    // needs its own generated id for the next table's foreign key)
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

  // remove roadmap (delete the user's roadmap from Supabase and clear local state)
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

  // fetch resume (load the signed-in user's most recent resume row and signed preview URL)
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

      // clear state (user has no resume yet)
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
        // sign URL (resumes bucket is private, so a fresh signed URL is needed
        // on every load — the signature expires after 1 hour)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('resumes')
          .createSignedUrl(resumeRow.file_url, 60 * 60);
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

  // upload resume (send the picked PDF to Storage and save its extracted text,
  // replacing any previous resume for this user)
  const uploadResume = async (localUri, extractedText) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No signed-in user to save the resume for.');

    const path = `${userId}/resume.pdf`;

    // convert file (supabase-js needs raw bytes, not a RN file:// URI — read as
    // base64, then decode to an ArrayBuffer it can actually upload)
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, decode(base64), { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    // delete old resume row (one resume per user — old AI feedback is stale for a new file anyway)
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

  // save feedback (attach AI-generated match score and feedback to the current resume row)
  const saveResumeFeedback = async (matchScore, feedbackArray) => {
    if (!resumeId) throw new Error('No saved resume to attach feedback to.');
    const { error } = await supabase
      .from('resumes')
      .update({ match_score: matchScore, feedback: feedbackArray })
      .eq('id', resumeId);
    if (error) throw error;
    setResumeFeedback({ matchScore, feedback: feedbackArray });
  };

  // remove resume (delete the file from Storage and its row from the DB, then clear local state)
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

  // sync with auth (load roadmap/resume on sign-in, clear everything on sign-out —
  // runs once on mount for the existing session, then again on every auth change)
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

  // compute active stage (single source of truth for which stage is "current" —
  // the first stage with any unchecked todo, or the last stage if all are done)
  const activeStageIndex = useMemo(() => {
    if (stages.length === 0) return -1;
    const firstIncomplete = stages.findIndex((stage, i) => {
      const checked = checkedByStage[i] || {};
      return stage.todos.some((_, j) => !checked[j]);
    });
    return firstIncomplete === -1 ? stages.length - 1 : firstIncomplete;
  }, [stages, checkedByStage]);

  // get stage status (label a stage done/current/upcoming relative to activeStageIndex)
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

// access context (throws early if a screen forgets to wrap itself in CareerProvider,
// rather than failing later with a confusing "cannot read property of null")
export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) throw new Error('useCareer must be used inside CareerProvider');
  return context;
}