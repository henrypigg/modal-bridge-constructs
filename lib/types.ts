import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export enum ModalIntegration {
  Spawn = 'spawn',
  Remote = 'remote',
}

export interface ModalConfig {
  readonly appName: string;
  readonly environment: string;
  readonly workspaceId: string;
  readonly tokenSecret?: Secret;
}
