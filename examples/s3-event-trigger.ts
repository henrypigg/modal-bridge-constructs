export class ModalS3EventTrigger extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'source', {
      bucketName: 'modal-image-demo-main',
    });

    const modalFunction = new ModalFunction(this, 'ModalFunction', {
      functionName: 'process_image',
      integrationPattern: ModalIntegration.Remote,
      modalConfig: {
        appName: 'demo-modal-app',
        workspaceId: 'ac-BOtPa7AzJeyhr41zUp2r5l',
        environment: 'main',
        tokenSecret: new ModalSecret(this, id, { secretName: 'modal-secret' }),
      },
    });
    bucket.grantReadWrite(modalFunction);

    modalFunction.addEventSource(
      new S3EventSource(bucket, {
        events: [EventType.OBJECT_CREATED],
        filters: [{ prefix: 'source/', suffix: '.png' }],
      })
    );
  }
}
