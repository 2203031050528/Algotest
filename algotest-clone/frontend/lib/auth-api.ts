import api from "./api";

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export async function register(
  payload: RegisterPayload
) {
  const response = await api.post(
    "/auth/register/",
    payload
  );

  return response.data;
}

export async function login(
  payload: LoginPayload
): Promise<LoginResponse> {

  const response = await api.post(
    "/auth/login/",
    payload
  );

  return response.data;
}