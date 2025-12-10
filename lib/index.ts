// import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface ModalAppProps {
  // Define construct properties here
}

export class ModalApp extends Construct {

  constructor(scope: Construct, id: string, props: ModalAppProps = {}) {
    super(scope, id);

    // Define construct contents here

    // example resource
    // const queue = new sqs.Queue(this, 'ModalBridgeConstructsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
