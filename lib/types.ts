import { Secret } from "aws-cdk-lib/aws-secretsmanager"

export enum ModalIntegration {
    Spawn = 'spawn', Remote = 'remote'
}

export interface ModalConfig {
    readonly appId: string
    readonly tokenSecret?: Secret
}