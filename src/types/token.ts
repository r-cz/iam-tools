/**
 * Common token-related type definitions for use across the application
 */

export type TokenType = "id_token" | "access_token" | "refresh_token" | "unknown";

export interface DecodedToken {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: {
    valid: boolean;
    error?: string;
  };
  raw: string;
}

export type ValidationSeverity = "info" | "warning" | "error";

export interface ValidationResult {
  claim: string;
  valid: boolean;
  message: string;
  severity: ValidationSeverity;
  details?: string;
}

export interface ClaimDescription {
  name: string;
  description: string;
  specification: string;
  required: boolean;
  tokenTypes: TokenType[];
  format?: string;
  example?: string;
}

export interface ProviderSpecificClaim {
  name: string;
  description: string;
  provider: string;
  format?: string;
  example?: string;
}
