import { Construct } from 'constructs';

export interface ModalAppProps {}

export class ModalApp extends Construct {

  constructor(scope: Construct, id: string, props: ModalAppProps = {}) {
    super(scope, id);

    // very useful construct
  }
}
