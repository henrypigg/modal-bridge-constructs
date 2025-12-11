import { Construct } from 'constructs';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';
import { CustomResource } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';

export interface ModalAppProps {
}

export class ModalApp extends Construct {
  private readonly deployerLambda: PythonFunction;
  private readonly deployerProvider: Provider;
  private readonly deployerCustomResource: CustomResource;

  constructor(scope: Construct, id: string, readonly props: ModalAppProps = {}) {
    super(scope, id);

    /** Deployer */
    this.deployerLambda = new PythonFunction(this, 'ModalDeployerLambda', {
      entry: join(__dirname, '../lib/modal-deployer'),
      runtime: Runtime.PYTHON_3_13
    });

    this.deployerProvider = new Provider(this, 'ModalDeployerProvider', {
      onEventHandler: this.deployerLambda,
    });

    this.deployerCustomResource = new CustomResource(this, 'ModalDeployerCustomResource', {
      serviceToken: this.deployerProvider.serviceToken,
      properties: {...this.props, id: id},
      resourceType: 'Custom::ModalApp'
    });
  }
}
