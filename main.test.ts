import { App } from '@aws-cdk/core';
import { HelloStack } from './main';

describe('Placeholder', () => {
  test('Empty', () => {
    const app = new App();
    const stack = new HelloStack(app, 'test');
    
    // need to write more tests.
    expect(stack).not.toBeNaN();
  });
});
