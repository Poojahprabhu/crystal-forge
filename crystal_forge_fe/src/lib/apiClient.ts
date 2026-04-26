import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "./tokenStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Don't set a default Content-Type — axios infers it per request:
//   plain object -> application/json
//   FormData     -> multipart/form-data; boundary=…
export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) throw new Error("No refresh token");
  const response = await axios.post(
    `${baseURL}/api/auth/refresh/`,
    { refresh },
    {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    },
  );
  const access = response.data.access as string;
  tokenStorage.setAccess(access);
  return access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes("/api/auth/refresh/");

    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newAccess = await refreshPromise;
        const headers = AxiosHeaders.from(original.headers);
        headers.set("Authorization", `Bearer ${newAccess}`);
        original.headers = headers;
        return apiClient(original);
      } catch (e) {
        tokenStorage.clear();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);

export type ApiError = AxiosError<Record<string, unknown>>;

export function extractErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | string | undefined;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") return data.detail;
      const firstField = Object.keys(data)[0];
      if (firstField) {
        const val = data[firstField];
        if (Array.isArray(val) && typeof val[0] === "string") {
          return `${firstField}: ${val[0]}`;
        }
        if (typeof val === "string") return `${firstField}: ${val}`;
      }
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export type RequestOptions = AxiosRequestConfig;
