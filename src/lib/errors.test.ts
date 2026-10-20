import { describe, expect, it } from "vitest";
import { AppError, toErrorResponse } from "./errors";

describe("AppError", () => {
  it("carries the contract status for its code", () => {
    expect(new AppError("not_found", "No such form").status).toBe(404);
    expect(new AppError("plan_limit_reached", "Upgrade").status).toBe(403);
    expect(new AppError("rate_limited", "Slow down").status).toBe(429);
  });
});

describe("toErrorResponse", () => {
  it("passes through an expected error with its details", () => {
    const error = new AppError("validation_failed", "Check the form", {
      fieldErrors: { body: ["Required"] },
    });
    expect(toErrorResponse(error)).toEqual({
      status: 400,
      body: {
        error: {
          code: "validation_failed",
          message: "Check the form",
          details: { fieldErrors: { body: ["Required"] } },
        },
      },
    });
  });

  it("omits details when there are none", () => {
    expect(toErrorResponse(new AppError("conflict", "Slug taken")).body).toEqual({
      error: { code: "conflict", message: "Slug taken" },
    });
  });

  it("reports a failed bot check as a plain validation error", () => {
    const response = toErrorResponse(new AppError("bot_check_failed", "Honeypot filled"));
    expect(response).toEqual({
      status: 400,
      body: { error: { code: "validation_failed", message: "Invalid request." } },
    });
  });

  it("hides the message of unexpected errors", () => {
    for (const thrown of [new Error("password authentication failed for user laurel"), "boom"]) {
      const response = toErrorResponse(thrown);
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe("internal_error");
      expect(JSON.stringify(response)).not.toMatch(/password|boom/);
    }
  });
});
