import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Function, IEventSource, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';
import { ModalConfig, ModalIntegration } from './types';
import { ModalSecret } from './utils';
import { Duration } from 'aws-cdk-lib';
import {
  Effect,
  FederatedPrincipal,
  IGrantable,
  IPrincipal,
  ManagedPolicy,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';

export interface ModalFunctionProps {
  readonly functionName: string;
  readonly integrationPattern: ModalIntegration;
  readonly modalConfig: ModalConfig;
  readonly params?: Record<string, any>;
  readonly delimiter?: string;
  readonly executionRole?: Role;
  readonly lambdaRuntime?: Runtime;
  readonly lambdaTimeout?: Duration;
  readonly oidcProvider?: OpenIdConnectProvider;
}

export class ModalFunction extends Construct implements IGrantable {
  private readonly executionRole: Role;
  private readonly handler: Function;
  private readonly oidcProvider: OpenIdConnectProvider;
  public grantPrincipal: IPrincipal;

  constructor(
    scope: Construct,
    id: string,
    readonly props: ModalFunctionProps
  ) {
    super(scope, id);

    const functionIdentifier = `${this.props.functionName}${this.props.delimiter ?? ''}_${this.props.integrationPattern}`;

    this.oidcProvider =
      props.oidcProvider ??
      new OpenIdConnectProvider(this, 'ModalOidcProvider', {
        url: 'https://oidc.modal.com',
        clientIds: ['oidc.modal.com'],
      });

    const tokenSecret =
      this.props.modalConfig.tokenSecret ??
      new ModalSecret(this, 'ModalSecret', {
        secretName: `${functionIdentifier}-secret`,
      });

    this.executionRole =
      this.props.executionRole ??
      new Role(this, 'ExecutionRole', {
        roleName: `${functionIdentifier}_role`,
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ],
      });
    this.grantPrincipal = this.executionRole;

    this.handler = new PythonFunction(this, 'ModalFunctionHandler', {
      functionName: functionIdentifier,
      role: this.executionRole,
      runtime: this.props.lambdaRuntime ?? Runtime.PYTHON_3_10,
      timeout: this.props.lambdaTimeout ?? Duration.minutes(5),
      entry: join(__dirname, '../lib/handlers/modal-function'),
      environment: {
        MODAL_INTEGRATION_PATTERN: this.props.integrationPattern,
        MODAL_APP_NAME: this.props.modalConfig.appName,
        MODAL_ENVIRONMENT_NAME: this.props.modalConfig.environment,
        MODAL_FUNCTION_NAME: this.props.functionName,
        MODAL_SECRET_ARN: tokenSecret.secretArn,
        PARAMETERS: JSON.stringify(props.params ?? {}),
      },
    });
    tokenSecret.grantRead(this.executionRole);

    this.grantOIDCAssumeRole();

    /* TODO: Add Step Function to orchestrate long-running tasks */
  }

  private grantOIDCAssumeRole() {
    const oidcPrincipal = new FederatedPrincipal(
      `arn:aws:iam::${this.executionRole.stack.account}:oidc-provider/oidc.modal.com`,
      {
        StringEquals: {
          'oidc.modal.com:aud': 'oidc.modal.com',
        },
        StringLike: {
          'oidc.modal.com:sub':
            `modal:workspace_id:${this.props.modalConfig.workspaceId}:` +
            `environment_name:${this.props.modalConfig.environment}:` +
            `app_name:${this.props.modalConfig.appName}:` +
            `function_name:${this.props.functionName}:*`,
        },
      },
      'sts:AssumeRoleWithWebIdentity'
    );

    this.executionRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [oidcPrincipal],
        actions: ['sts:AssumeRoleWithWebIdentity'],
      })
    );
  }

  public addEventSource(eventSource: IEventSource) {
    this.handler.addEventSource(eventSource);
  }
}
