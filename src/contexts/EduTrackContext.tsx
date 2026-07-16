'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  moduleService, evaluationService, learningOutcomeService, criterionService,
  workUnitService, activityService, studentService, gradeService,
  raRelationshipService, incidentService, sessionLogService, tutoringService,
  calendarEventService,
  foundationService,
  Module, Evaluation, LearningOutcome, Criterion, WorkUnit, Activity,
  Student, ActivityGrade, RARelationship, Incident, SessionLog, TutoringAction, CalendarEvent,
} from '@/lib/services/edutrackService';
import { configureAcademicCalculations } from '@/lib/mockData';

const ACTIVE_MODULE_ID = 'module-ruslvg5ye';

interface EduTrackData {
  loading: boolean;
  error: string | null;
  activeModule: Module | null;
  activeModuleId: string;
  setActiveModuleId: (moduleId: string) => void;
  modules: Module[];
  evaluations: Evaluation[];
  learningOutcomes: LearningOutcome[];
  criteria: Criterion[];
  workUnits: WorkUnit[];
  activities: Activity[];
  students: Student[];
  grades: ActivityGrade[];
  raRelationships: RARelationship[];
  incidents: Incident[];
  sessionLogs: SessionLog[];
  tutoringActions: TutoringAction[];
  calendarEvents: CalendarEvent[];
  // Mutators
  refreshActivities: () => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshGrades: () => Promise<void>;
  refreshIncidents: () => Promise<void>;
  refreshSessionLogs: () => Promise<void>;
  refreshTutoringActions: () => Promise<void>;
  refreshCalendarEvents: () => Promise<void>;
  refreshRARelationships: () => Promise<void>;
  refreshLearningOutcomes: () => Promise<void>;
  refreshCriteria: () => Promise<void>;
  refreshWorkUnits: () => Promise<void>;
}

const EduTrackContext = createContext<EduTrackData>({
  loading: true, error: null, activeModule: null, activeModuleId: ACTIVE_MODULE_ID,
  setActiveModuleId: () => {}, modules: [], evaluations: [],
  learningOutcomes: [], criteria: [], workUnits: [], activities: [], students: [],
  grades: [], raRelationships: [], incidents: [], sessionLogs: [], tutoringActions: [],
  calendarEvents: [],
  refreshActivities: async () => {}, refreshStudents: async () => {},
  refreshGrades: async () => {}, refreshIncidents: async () => {},
  refreshSessionLogs: async () => {}, refreshTutoringActions: async () => {},
  refreshCalendarEvents: async () => {}, refreshRARelationships: async () => {},
  refreshLearningOutcomes: async () => {}, refreshCriteria: async () => {},
  refreshWorkUnits: async () => {},
});

export const useEduTrack = () => useContext(EduTrackContext);

export function EduTrackProvider({ children }: { children: React.ReactNode }) {
  const [activeModuleId, setActiveModuleIdState] = useState(ACTIVE_MODULE_ID);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [workUnits, setWorkUnits] = useState<WorkUnit[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<ActivityGrade[]>([]);
  const [raRelationships, setRARelationships] = useState<RARelationship[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [tutoringActions, setTutoringActions] = useState<TutoringAction[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    configureAcademicCalculations({ activities, criteria, grades, evaluations, workUnits });
  }, [activities, criteria, grades, evaluations, workUnits]);

  const activeModule = modules.find(m => m.id === activeModuleId) ?? modules[0] ?? null;

  const setActiveModuleId = useCallback((moduleId: string) => {
    setActiveModuleIdState(moduleId);
    window.localStorage.setItem('edutrack-active-module', moduleId);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem('edutrack-active-module');
    if (saved) setActiveModuleIdState(saved);
  }, []);

  const refreshActivities = useCallback(async () => {
    const data = await activityService.getByModule(activeModuleId);
    setActivities(data);
  }, [activeModuleId]);

  const refreshStudents = useCallback(async () => {
    const data = await studentService.getByModule(activeModuleId);
    setStudents(data);
  }, [activeModuleId]);

  const refreshGrades = useCallback(async () => {
    const data = await gradeService.getByModule(activeModuleId);
    setGrades(data);
  }, [activeModuleId]);

  const refreshIncidents = useCallback(async () => {
    const data = await incidentService.getAll();
    setIncidents(data);
  }, []);

  const refreshSessionLogs = useCallback(async () => {
    const data = await sessionLogService.getByModule(activeModuleId);
    setSessionLogs(data);
  }, [activeModuleId]);

  const refreshTutoringActions = useCallback(async () => {
    const data = await tutoringService.getAll();
    setTutoringActions(data);
  }, []);

  const refreshCalendarEvents = useCallback(async () => {
    const data = await calendarEventService.getByModule(activeModuleId);
    setCalendarEvents(data);
  }, [activeModuleId]);

  const refreshRARelationships = useCallback(async () => {
    const data = await raRelationshipService.getByModule(activeModuleId);
    setRARelationships(data);
  }, [activeModuleId]);

  const refreshLearningOutcomes = useCallback(async () => {
    const data = await learningOutcomeService.getByModule(activeModuleId);
    setLearningOutcomes(data);
  }, [activeModuleId]);

  const refreshCriteria = useCallback(async () => {
    const data = await criterionService.getByModule(activeModuleId);
    setCriteria(data);
  }, [activeModuleId]);

  const refreshWorkUnits = useCallback(async () => {
    const data = await workUnitService.getByModule(activeModuleId);
    setWorkUnits(data);
  }, [activeModuleId]);

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        setError(null);
        await foundationService.claimLegacyData();
        const [
          mods, evals, los, crit, wus, acts, studs, grd, raRels, incs, slogs, tutors, cevents,
        ] = await Promise.all([
          moduleService.getAll(),
          evaluationService.getByModule(activeModuleId),
          learningOutcomeService.getByModule(activeModuleId),
          criterionService.getByModule(activeModuleId),
          workUnitService.getByModule(activeModuleId),
          activityService.getByModule(activeModuleId),
          studentService.getByModule(activeModuleId),
          gradeService.getByModule(activeModuleId),
          raRelationshipService.getByModule(activeModuleId),
          incidentService.getAll(),
          sessionLogService.getByModule(activeModuleId),
          tutoringService.getAll(),
          calendarEventService.getByModule(activeModuleId),
        ]);
        setModules(mods);
        setEvaluations(evals);
        setLearningOutcomes(los);
        setCriteria(crit);
        setWorkUnits(wus);
        setActivities(acts);
        setStudents(studs);
        setGrades(grd);
        setRARelationships(raRels);
        setIncidents(incs);
        setSessionLogs(slogs);
        setTutoringActions(tutors);
        setCalendarEvents(cevents);
      } catch (e: any) {
        setError(e.message ?? 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [activeModuleId]);

  return (
    <EduTrackContext.Provider value={{
      loading, error, activeModule, activeModuleId, setActiveModuleId, modules, evaluations, learningOutcomes, criteria,
      workUnits, activities, students, grades, raRelationships, incidents, sessionLogs,
      tutoringActions, calendarEvents,
      refreshActivities, refreshStudents, refreshGrades, refreshIncidents,
      refreshSessionLogs, refreshTutoringActions, refreshCalendarEvents,
      refreshRARelationships, refreshLearningOutcomes, refreshCriteria, refreshWorkUnits,
    }}>
      {children}
    </EduTrackContext.Provider>
  );
}
