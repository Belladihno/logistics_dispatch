import { RegisterQueueOptions } from '@nestjs/bullmq';

export const DISPATCH_QUEUE = 'dispatch-queue';

export const DISPATCH_QUEUE_CONFIG: RegisterQueueOptions = {
  name: DISPATCH_QUEUE,
};

export enum DispatchJobName {
  ASSIGN_DRIVER = 'ASSIGN_DRIVER',
  DISPATCH_TIMEOUT = 'DISPATCH_TIMEOUT',
}

export const DISPATCH_TIMEOUT_KEY = (orderId: string): string =>
  `dispatch_timeout:${orderId}`;

export const DISPATCH_DEFAULTS = {
  MAX_ATTEMPTS: 3,
  TIMEOUT_SECONDS: 20,
} as const;
