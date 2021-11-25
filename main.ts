import * as ec2 from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import * as pipelines from '@aws-cdk/pipelines';
import * as cdk from '@aws-cdk/core';
import * as cdk8s from 'cdk8s';
import * as synthetics from '@aws-cdk/aws-synthetics'
import { HelloChart } from './hello-chart';
import path = require('path');

export class HelloStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const vpc = this.createVpc();
    const cluster = this.createEksCluster(vpc);

    const cdk8sApp = new cdk8s.App();
    const helloChart = new HelloChart(cdk8sApp, 'HelloChart');
    cluster.addCdk8sChart('hello-chart', helloChart);

    this.createPipeline();

    const helloServiceAddress = new eks.KubernetesObjectValue(this, 'ServiceAddress', {
      cluster,
      objectType: 'service',
      objectName: helloChart.service.name,
      jsonPath: '.status.loadBalancer.ingress[0].hostname'
    });

    var healthCheckEndpoint = `http://${helloServiceAddress.value}`;
    this.createUpTimeMonitoring(healthCheckEndpoint);
    
    new cdk.CfnOutput(this, 'ServiceEndpoint', { value: healthCheckEndpoint });
  }


  /**
   * create VPC with minimal setup.
   * @returns 
   */
  private createVpc() : ec2.Vpc {
    return new ec2.Vpc(this, 'Vpc', { natGateways: 1 });
  }

  /**
   * create an Eks Cluster with minimal setup.
   * @param vpc 
   * @returns 
   */
  private createEksCluster(vpc: ec2.Vpc) : eks.Cluster {
    return new eks.Cluster(this, 'Cluster', {
      vpc,
      version: eks.KubernetesVersion.V1_20,
    });
  }

  /**
   * A pipeline to deploy changes automatically when main branch is updated.
   * @returns 
   */
  private createPipeline() : pipelines.CodePipeline {
    return new pipelines.CodePipeline(this, 'HelloPipeline', {
      pipelineName: 'HelloPipeline',
      crossAccountKeys: false,
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.gitHub('yuft/hello-aws', 'main'),
        commands: ['npm ci', 'npx cdk synth'],
      })
    });
  }

  /**
   * Up time monitoring (every 5 min) with AWS Synthetics
   * https://docs.aws.amazon.com/cdk/api/latest/docs/aws-synthetics-readme.html
   */
  private createUpTimeMonitoring(healthCheckEndpoint: string) : synthetics.Canary {
    return new synthetics.Canary(this, 'HelloCanary', {
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(5)),
      test: synthetics.Test.custom({
        code: synthetics.Code.fromAsset(path.join(__dirname, 'canary')),
        handler: 'index.handler',
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_1,
      environmentVariables: {
        url: healthCheckEndpoint,
      }
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();
new HelloStack(app, 'hello-stack-dev', { env: devEnv });
app.synth();
