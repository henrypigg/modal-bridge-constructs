import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Function, IEventSource, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs'
import { join } from 'path';
import { ModalConfig, ModalIntegration } from './types';
import { ModalSecret } from './utils';
import { Duration } from 'aws-cdk-lib';

export interface ModalFunctionProps {
    readonly functionName: string
    readonly integrationPattern: ModalIntegration
    readonly modalConfig: ModalConfig
    readonly lambdaRuntime?: Runtime
    readonly lambdaTimeout?: Duration
}

export class ModalFunction extends Construct {
    private readonly handler: Function;

	constructor(scope: Construct, id: string, readonly props: ModalFunctionProps) {
		super(scope, id)

        const tokenSecret = this.props.modalConfig.tokenSecret ?? new ModalSecret(this, 'ModalSecret', {
            secretName: `${this.props.functionName}-secret`
        });
                
		this.handler = new PythonFunction(this, 'ModalFunctionHandler', {
			functionName: `${this.props.functionName}_${this.props.integrationPattern}`,
            runtime: this.props.lambdaRuntime ?? Runtime.PYTHON_3_10,
            timeout: this.props.lambdaTimeout ?? Duration.minutes(5),
            entry: join(__dirname, `../lib/handlers/${this.props.integrationPattern}`),
            environment: {
                MODAL_APP_ID: this.props.modalConfig.appId,
                MODAL_FUNCTION_NAME: this.props.functionName,
                MODAL_SECRET_ARN: tokenSecret.secretArn
            }
		})
        tokenSecret.grantRead(this.handler);

        /* TODO: Add Step Function to orchestrate long-running tasks */
	}

    public addEventSource(eventSource: IEventSource) {
        this.handler.addEventSource(eventSource)
    }
}