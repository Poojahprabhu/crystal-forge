export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  user: User;
  tokens: AuthTokens;
};
