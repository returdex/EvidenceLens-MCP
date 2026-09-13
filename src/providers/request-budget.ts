import { createHmac, timingSafeEqual } from "node:crypto";
import { isProxy } from "node:util/types";
import type { ProviderRequestBudget, ProviderRequestReceipt } from "./types.js";

export const PROVIDER_REQUEST_RECEIPT_SCHEMA = "evidencelens.provider-request-receipt.v1" as const;

const receiptKeys = [
  "schema", "generation", "reservation_count", "observed_provider_requests",
  "max_retries", "fallback", "diagnostic_second_call", "mac"
] as const;

type UnsignedReceipt = Omit<ProviderRequestReceipt, "mac">;

function validGeneration(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function validKey(value: Uint8Array): boolean {
  return value.byteLength === 32;
}

function sign(value: UnsignedReceipt, key: Uint8Array): string {
  return createHmac("sha256", key).update(JSON.stringify(value)).digest("hex");
}

function authenticate(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(actual) || !/^[a-f0-9]{64}$/u.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function unsignedReceipt(generation: string, observed: 0 | 1): UnsignedReceipt {
  return {
    schema: PROVIDER_REQUEST_RECEIPT_SCHEMA,
    generation,
    reservation_count: 1,
    observed_provider_requests: observed,
    max_retries: 0,
    fallback: false,
    diagnostic_second_call: false
  };
}

export function createProviderRequestBudget(options: {
  generation: string;
  key: Uint8Array;
}): ProviderRequestBudget {
  if (!validGeneration(options.generation) || !validKey(options.key)) {
    throw new Error("PROVIDER_REQUEST_BUDGET_INVALID");
  }
  const ownedKey = Buffer.from(options.key);
  let observed: 0 | 1 = 0;
  return Object.freeze({
    acquireHttpSend(): void {
      if (observed !== 0) throw new Error("PROVIDER_REQUEST_BUDGET_EXHAUSTED");
      // This synchronous transition is the capability boundary. It happens in
      // the same turn immediately before transport.fetch can be invoked.
      observed = 1;
    },
    receipt(): ProviderRequestReceipt {
      const unsigned = unsignedReceipt(options.generation, observed);
      return Object.freeze({ ...unsigned, mac: sign(unsigned, ownedKey) });
    }
  });
}

export function verifyProviderRequestReceipt(
  value: unknown,
  expected: { generation: string; key: Uint8Array }
): value is ProviderRequestReceipt {
  if (!validGeneration(expected.generation) || !validKey(expected.key)
    || typeof value !== "object" || value === null || Array.isArray(value) || isProxy(value)) return false;
  const object = value as Record<string, unknown>;
  const keys = Reflect.ownKeys(object);
  if (keys.length !== receiptKeys.length || keys.some((key, index) => key !== receiptKeys[index])) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  for (const key of receiptKeys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) return false;
  }
  if (object.schema !== PROVIDER_REQUEST_RECEIPT_SCHEMA
    || object.generation !== expected.generation
    || object.reservation_count !== 1 || !Number.isSafeInteger(object.reservation_count)
    || (object.observed_provider_requests !== 0 && object.observed_provider_requests !== 1)
    || !Number.isSafeInteger(object.observed_provider_requests)
    || object.max_retries !== 0 || !Number.isSafeInteger(object.max_retries)
    || object.fallback !== false || object.diagnostic_second_call !== false
    || typeof object.mac !== "string") return false;
  const unsigned = unsignedReceipt(object.generation, object.observed_provider_requests);
  return authenticate(object.mac, sign(unsigned, expected.key));
}
