import type {
  CartResponse,
  CatchResponse,
  ClaimResponse,
  GameSessionResponse,
  OrderHistoryResponse,
  PlaceOrderResponse,
  RestaurantPageResponse,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function createOrRestoreGame(
  userId = "emma",
): Promise<GameSessionResponse> {
  return request<GameSessionResponse>("/api/game-sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export function catchGem(
  gameId: string,
  gemId: string,
  requestId: string,
): Promise<CatchResponse> {
  return request<CatchResponse>(`/api/game-sessions/${gameId}/catch`, {
    method: "POST",
    body: JSON.stringify({ gem_id: gemId, request_id: requestId }),
  });
}

export function claimDiscount(gameId: string): Promise<ClaimResponse> {
  return request<ClaimResponse>(`/api/game-sessions/${gameId}/claim`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getRestaurant(
  restaurantId: string,
  dealToken: string | null,
): Promise<RestaurantPageResponse> {
  const query = dealToken ? `?deal=${encodeURIComponent(dealToken)}` : "";
  return request<RestaurantPageResponse>(
    `/api/restaurants/${restaurantId}${query}`,
  );
}

export function getCart(gameId: string): Promise<CartResponse> {
  return request<CartResponse>(`/api/game-sessions/${gameId}/cart`);
}

export function placeOrder(gameId: string): Promise<PlaceOrderResponse> {
  return request<PlaceOrderResponse>(
    `/api/game-sessions/${gameId}/place-order`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function getOrderHistory(
  userId = "emma",
): Promise<OrderHistoryResponse> {
  return request<OrderHistoryResponse>(
    `/api/users/${encodeURIComponent(userId)}/order-history`,
  );
}

export function resetDemo(userId = "emma"): Promise<{ status: string }> {
  return request<{ status: string }>("/api/demo/reset", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}
