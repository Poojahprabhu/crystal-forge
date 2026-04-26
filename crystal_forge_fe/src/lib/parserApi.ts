import axios from "axios";
import { apiClient } from "./apiClient";

export type EvidenceItem = {
  skill: string;
  evidence: string;
};

export type QuestionType = "coding" | "applied" | "conceptual" | (string & {});

export type QuestionItem = {
  id: number;
  skill: string;
  type: QuestionType;
  question: string;
};

export type AnalyzeResponse = {
  sufficient: boolean;
  summary: string;
  claimed_skills: string[];
  weak_skills: string[];
  evidence: EvidenceItem[];
  questionnaire: QuestionItem[];
};

export type AnswerInput = {
  id: number;
  answer: string;
};

export type ChatHistoryItem = {
  id: number;
  skill: string;
  type: string;
  question: string;
  answer: string;
};

export type ChatVerdict = {
  sufficient: boolean;
  summary: string;
  claimed_skills: string[];
  evidence: EvidenceItem[];
  weak_skills: string[];
};

export type ChatStep =
  | {
      done: false;
      step: number;
      total: number;
      question: QuestionItem;
      history: ChatHistoryItem[];
    }
  | {
      done: true;
      verdict: ChatVerdict;
      history: ChatHistoryItem[];
    };

export const parserApi = {
  async analyze(document: File): Promise<AnalyzeResponse> {
    const fd = new FormData();
    fd.append("document", document);
    const { data } = await apiClient.post<AnalyzeResponse>(
      "/api/parser/analyze/",
      fd,
    );
    return data;
  },
  async submitAnswers(answers: AnswerInput[]): Promise<AnalyzeResponse> {
    const { data } = await apiClient.post<AnalyzeResponse>(
      "/api/parser/answers/",
      { answers },
    );
    return data;
  },
  async getProfile(): Promise<AnalyzeResponse | null> {
    try {
      const { data } = await apiClient.get<AnalyzeResponse>(
        "/api/parser/analyze/",
      );
      return data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) return null;
      throw e;
    }
  },
  async getChat(): Promise<ChatStep> {
    const { data } = await apiClient.get<ChatStep>("/api/parser/chat/");
    return data;
  },
  async sendChatAnswer(answer: string): Promise<ChatStep> {
    const { data } = await apiClient.post<ChatStep>("/api/parser/chat/", {
      answer,
    });
    return data;
  },
};
