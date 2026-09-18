import api from "./api";
import type { Strategy } from "@/types/strategy";

export interface CreateStrategyPayload {
  name: string;
  symbol: string;
  timeframe: string;
  capital: number;
  configuration: Record<string, unknown>;
}

export async function getStrategies(): Promise<Strategy[]> {
  const response = await api.get("/strategies/");
  return response.data;
}

export async function getStrategy(
  id: number
): Promise<Strategy> {
  const response = await api.get(`/strategies/${id}/`);
  return response.data;
}

export async function createStrategy(
  payload: CreateStrategyPayload
): Promise<Strategy> {
  const response = await api.post(
    "/strategies/",
    payload
  );

  return response.data;
}

export async function updateStrategy(
  id: number,
  payload: Partial<CreateStrategyPayload>
): Promise<Strategy> {
  const response = await api.put(
    `/strategies/${id}/`,
    payload
  );

  return response.data;
}

export async function deleteStrategy(
  id: number
): Promise<void> {
  await api.delete(`/strategies/${id}/`);
}