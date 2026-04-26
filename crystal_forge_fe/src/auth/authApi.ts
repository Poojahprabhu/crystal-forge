import { apiClient } from "@/lib/apiClient";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  User,
} from "./types";

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>("/api/auth/login/", payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await apiClient.post<RegisterResponse>(
      "/api/auth/register/",
      payload,
    );
    return data;
  },

  async verify(token: string): Promise<void> {
    await apiClient.post("/api/auth/verify/", { token });
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>("/api/users/me/");
    return data;
  },
};
