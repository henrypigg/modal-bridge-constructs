import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class ModalSecretProps { secretName?: string }

export class ModalSecret extends Secret {
    constructor(scope: Construct, id: string, readonly props: ModalSecretProps) {
        super(scope, id, {
            secretName: props.secretName,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ 
                    MODAL_TOKEN_ID: 'token-id',
                }),
                generateStringKey: 'MODAL_TOKEN_SECRET',
            },
        })
    }
}