import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export type RateLimitPolicy =
  | "api"
  | "changePassword"
  | "changePasswordIp"
  | "withdraw"
  | "withdrawIp"
  | "taskCheckout"
  | "taskCheckoutIp"
  | "subscriptionCheckout"
  | "subscriptionCheckoutIp"
  | "activateTask"
  | "reportTask";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const hasRedisConfig =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasRedisConfig ? Redis.fromEnv() : null;
const ephemeralCache = new Map<string, number>();

const ratelimits: Record<RateLimitPolicy, Ratelimit> | null = redis
  ? {
      api: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:api",
        limiter: Ratelimit.slidingWindow(120, "1 m"),
      }),
      changePassword: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:change-password",
        limiter: Ratelimit.slidingWindow(5, "15 m"),
      }),
      changePasswordIp: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:change-password-ip",
        limiter: Ratelimit.slidingWindow(25, "1 h"),
      }),
      withdraw: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:withdraw",
        limiter: Ratelimit.slidingWindow(3, "15 m"),
      }),
      withdrawIp: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:withdraw-ip",
        limiter: Ratelimit.slidingWindow(12, "1 h"),
      }),
      taskCheckout: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:task-checkout",
        limiter: Ratelimit.slidingWindow(5, "10 m"),
      }),
      taskCheckoutIp: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:task-checkout-ip",
        limiter: Ratelimit.slidingWindow(20, "1 h"),
      }),
      subscriptionCheckout: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:subscription-checkout",
        limiter: Ratelimit.slidingWindow(5, "10 m"),
      }),
      subscriptionCheckoutIp: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:subscription-checkout-ip",
        limiter: Ratelimit.slidingWindow(20, "1 h"),
      }),
      activateTask: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:activate-task",
        limiter: Ratelimit.slidingWindow(20, "10 m"),
      }),
      reportTask: new Ratelimit({
        redis,
        ephemeralCache,
        prefix: "rl:report-task",
        limiter: Ratelimit.slidingWindow(10, "1 h"),
      }),
    }
  : null;

const fallbackSuccess = (): RateLimitResult => ({
  success: true,
  limit: 0,
  remaining: 0,
  reset: Date.now(),
});

export function isRateLimitConfigured(): boolean {
  return Boolean(ratelimits);
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

async function runRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitResult> {
  if (!ratelimits) {
    return fallbackSuccess();
  }

  const result = await ratelimits[policy].limit(identifier);
  if ("pending" in result && result.pending) {
    void result.pending;
  }

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function rateLimitByIp(
  policy: RateLimitPolicy,
  request: Request,
): Promise<RateLimitResult> {
  const ip = getRequestIp(request);
  return runRateLimit(policy, `ip:${ip}`);
}

export async function rateLimitByUser(
  policy: Exclude<RateLimitPolicy, "api">,
  userId: string,
): Promise<RateLimitResult> {
  return runRateLimit(policy, `user:${userId}`);
}

export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  if (!isRateLimitConfigured() || result.limit <= 0) {
    return response;
  }

  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));

  if (!result.success) {
    response.headers.set("Retry-After", getRetryAfterSeconds(result).toString());
  }

  return response;
}

export function createRateLimitResponse(
  message: string,
  result: RateLimitResult,
): NextResponse {
  const response = NextResponse.json(
    { error: message },
    { status: 429 },
  );

  return applyRateLimitHeaders(response, result);
}

function getRetryAfterSeconds(result: RateLimitResult): number {
  return Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
}