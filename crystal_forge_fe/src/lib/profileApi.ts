import { apiClient } from "./apiClient";
import type { JdAnalysis, SkillNeed, StudyPlanWeek, Resource } from "./matcherApi";
import type { User } from "@/auth/types";
import type { EvidenceItem, QuestionItem } from "./parserApi";

export type ResumeOverview = {
  sufficient: boolean;
  summary: string;
  claimed_skills_count: number;
  weak_skills_count: number;
  has_pending_questionnaire: boolean;
  updated_at: string;
};

export type JdAnalysisCounts = {
  total: number;
  completed: number;
  in_progress: number;
  failed: number;
};

export type ProfileOverview = {
  user: User;
  resume: ResumeOverview | null;
  jd_analyses: JdAnalysisCounts;
  study_plans_count: number;
};

export type ResumeSnapshot = {
  sufficient: boolean;
  summary: string;
  claimed_skills: string[];
  evidence: EvidenceItem[];
  weak_skills: string[];
  questionnaire: QuestionItem[];
  qa: Array<QuestionItem & { answer: string }>;
  created_at: string;
  updated_at: string;
};

export type ProfileJdAnalysis = JdAnalysis & {
  batch_id: number;
  created_at: string;
  updated_at: string;
  jd_text?: string;
};

export type StudyPlanRecord = {
  analysis_id: number;
  batch_id: number;
  created_at: string;
  matched_percentage: number | null;
  skills_needed_addons: SkillNeed[];
  skills_needed_new: SkillNeed[];
  study_plan: StudyPlanWeek[];
  resources: Record<string, Resource[]>;
};

export const profileApi = {
  async overview(): Promise<ProfileOverview> {
    const { data } = await apiClient.get<ProfileOverview>("/api/profile/");
    return data;
  },
  async resume(): Promise<ResumeSnapshot | null> {
    try {
      const { data } = await apiClient.get<ResumeSnapshot>(
        "/api/profile/resume/",
      );
      return data;
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) return null;
      throw e;
    }
  },
  async listJdAnalyses(): Promise<ProfileJdAnalysis[]> {
    const { data } = await apiClient.get<ProfileJdAnalysis[]>(
      "/api/profile/jd-analyses/",
    );
    return data;
  },
  async getJdAnalysis(id: number): Promise<ProfileJdAnalysis> {
    const { data } = await apiClient.get<ProfileJdAnalysis>(
      `/api/profile/jd-analyses/${id}/`,
    );
    return data;
  },
  async listStudyPlans(): Promise<StudyPlanRecord[]> {
    const { data } = await apiClient.get<StudyPlanRecord[]>(
      "/api/profile/study-plans/",
    );
    return data;
  },
  async getStudyPlan(analysisId: number): Promise<StudyPlanRecord> {
    const { data } = await apiClient.get<StudyPlanRecord>(
      `/api/profile/study-plans/${analysisId}/`,
    );
    return data;
  },
};
