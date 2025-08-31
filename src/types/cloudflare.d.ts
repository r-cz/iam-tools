/**
 * Type definitions for Cloudflare Pages Functions (legacy) and general Worker context helpers
 */

declare interface PagesFunction<Env = unknown, Params extends string = any, Data extends Record<string, unknown> = {}> {
  (context: EventContext<Env, Params, Data>): Response | Promise<Response>;
}

declare interface EventContext<Env = unknown, Params extends string = any, Data extends Record<string, unknown> = {}> {
  request: Request;
  env: Env;
  params: Params extends string ? { [key in Params]?: string } : Record<string, string>;
  data: Data;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  next(): Promise<Response>;
}
