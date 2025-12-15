import { Code, Function, IEventSource, Runtime } from 'aws-cdk-lib/aws-lambda';
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

/**
 * Properties for creating a ModalFunction construct.
 */
export interface ModalFunctionProps {
  /**
   * The name of the Modal function to invoke. Must match the function name
   * in your deployed Modal app exactly.
   */
  readonly functionName: string;

  /**
   * How to invoke the Modal function.
   */
  readonly integrationPattern: ModalIntegration;

  /**
   * Configuration for connecting to your Modal application.
   */
  readonly modalConfig: ModalConfig;

  /**
   * Static parameters passed to every Modal function invocation.
   * These are passed as the second argument to your Modal function.
   *
   * @default {}
   */
  readonly params?: Record<string, any>;

  /**
   * Delimiter inserted between the function name and integration pattern
   * when generating AWS resource names.
   *
   * @default ''
   */
  readonly delimiter?: string;

  /**
   * Custom IAM execution role for the Lambda bridge function.
   * The role must have permission to invoke Secrets Manager.
   *
   * @default - A new role is created with basic Lambda execution permissions
   */
  readonly executionRole?: Role;

  /**
   * The Node.js runtime for the Lambda bridge function.
   *
   * @default Runtime.NODEJS_22_X
   */
  readonly lambdaRuntime?: Runtime;

  /**
   * Timeout for the Lambda bridge function. For `Remote` integration,
   * this should be longer than your Modal function's expected execution time.
   *
   * @default Duration.minutes(5)
   */
  readonly lambdaTimeout?: Duration;

  /**
   * An existing OIDC provider for Modal. Reuse this across multiple
   * ModalFunction constructs to avoid creating duplicate providers.
   *
   * @default - A new OIDC provider for oidc.modal.com is created
   */
  readonly oidcProvider?: OpenIdConnectProvider;
}

export class ModalFunction extends Construct implements IGrantable {
  private readonly executionRole: Role;
  private readonly oidcProvider: OpenIdConnectProvider;
  public readonly grantPrincipal: IPrincipal;
  public readonly handler: Function;

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

    this.handler = new Function(this, 'Handler', {
      functionName: functionIdentifier,
      runtime: this.props.lambdaRuntime ?? Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: Code.fromAsset(join(__dirname, 'modal-function-handler')),
      timeout: this.props.lambdaTimeout ?? Duration.minutes(5),
      role: this.executionRole,
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
