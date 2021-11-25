import * as cdk8s from 'cdk8s';
import * as kplus from 'cdk8s-plus';
import * as constructs from 'constructs';

export class HelloChart extends cdk8s.Chart {
  readonly service: kplus.Service;
  readonly deploy: kplus.Deployment;
  constructor(scope: constructs.Construct, id: string) {
    super(scope, id);

    this.deploy = new kplus.Deployment(this, 'Deployment', {
      containers: [
        new kplus.Container({
          image: 'public.ecr.aws/pahudnet/flask-docker-sample',
          env: {
            PLATFORM: { value: "ap-southeast-2" },
          },
        }),
      ],
    });

    this.service = this.deploy.expose(80, {
      serviceType: kplus.ServiceType.LOAD_BALANCER,
    });
  }
}