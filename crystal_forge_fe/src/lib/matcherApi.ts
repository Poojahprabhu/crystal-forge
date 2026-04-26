import { apiClient } from "./apiClient";

export type JdAnalysisStatus = "pending" | "running" | "done" | "failed";

export type SkillNeed = {
  skill: string;
  reason: string;
};

export type Resource = {
  title: string;
  url: string;
  snippet: string;
};

export type StudyPlanWeek = {
  week: number;
  skill: string;
  category: "addon" | "new" | (string & {});
  goals: string;
  resources: Resource[];
};

export type JdAnalysis = {
  id: number;
  status: JdAnalysisStatus;
  matched_percentage: number | null;
  skills_matched: string[];
  skills_needed: {
    addons: SkillNeed[];
    new: SkillNeed[];
  };
  feedback: string;
  resources?: Record<string, Resource[]>;
  study_plan?: StudyPlanWeek[];
  error: string;
};

export type JdAnalysisBatch = {
  id: number;
  status: JdAnalysisStatus;
  created_at: string;
  analyses: JdAnalysis[];
};

export const matcherApi = {
  async createBatch(jds: string[]): Promise<JdAnalysisBatch> {
    const { data } = await apiClient.post<JdAnalysisBatch>(
      "/api/matcher/analyze/",
      { jds },
    );
    return data;
  },
  async getBatch(batchId: number): Promise<JdAnalysisBatch> {
    const { data } = await apiClient.get<JdAnalysisBatch>(
      `/api/matcher/analyze/${batchId}/`,
    );
    return data;
  },
  async listBatches(): Promise<JdAnalysisBatch[]> {
    const { data } = await apiClient.get<JdAnalysisBatch[]>(
      "/api/matcher/analyze/",
    );
    return data;
  },
};
