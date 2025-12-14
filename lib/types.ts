import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Defines how the Lambda bridge invokes the Modal function.
 */
export enum ModalIntegration {
  /**
   * Fire-and-forget invocation. The Lambda returns immediately with a function call ID.
   * Use for long-running tasks or background jobs where you don't need the result.
   */
  Spawn = 'spawn',

  /**
   * Synchronous invocation. The Lambda waits for the Modal function to complete
   * and returns the result. Use when you need the return value.
   */
  Remote = 'remote',
}

/**
 * Configuration for connecting to a Modal application.
 */
export interface ModalConfig {
  /**
   * The name of your Modal app as defined in your Modal code.
   *
   * @example 'my-image-processor'
   */
  readonly appName: string;

  /**
   * The Modal environment to use (e.g., 'main', 'dev', 'staging').
   *
   * @example 'main'
   */
  readonly environment: string;

  /**
   * Your Modal workspace ID. Find this at https://modal.com/settings.
   *
   * @example 'ws-abc123xyz'
   */
  readonly workspaceId: string;

  /**
   * An existing Secrets Manager secret containing your Modal API credentials.
   * The secret must contain `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` keys.
   *
   * If not provided, a new secret will be created that you must populate
   * after deployment.
   *
   * @default - A new ModalSecret is created
   */
  readonly tokenSecret?: Secret;
}
