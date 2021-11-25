import * as cdk from '@aws-cdk/core';
import { HelloStack } from './main'

export class PipelineStageDeploy extends cdk.Stage {

    constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        new HelloStack(this, 'HelloStack');
    }
}