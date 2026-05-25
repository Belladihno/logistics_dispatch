import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  DispatchJobName,
  DISPATCH_QUEUE,
} from './constants/dispatch.constants';
import {
  AssignDriverJobDto,
  DispatchTimeoutJobDto,
} from './dto/dispatch-job.dto';
import { DispatchService } from './dispatch.service';

type DispatchJobPayload = AssignDriverJobDto | DispatchTimeoutJobDto;

@Processor(DISPATCH_QUEUE)
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(private readonly dispatchService: DispatchService) {
    super();
  }

  async process(job: Job<DispatchJobPayload>): Promise<void> {
    if (!isDispatchJobName(job.name)) {
      this.logger.warn(
        `Unknown dispatch job name "${job.name}" received for job ${String(job.id)}`,
      );
      return;
    }

    switch (job.name) {
      case DispatchJobName.ASSIGN_DRIVER: {
        const assignOrderId = getOrderId(job.data);
        this.logger.debug(
          `Processing ASSIGN_DRIVER job ${String(job.id)} for order ${assignOrderId ?? 'unknown'}`,
        );
        if (!isAssignDriverJob(job.data)) {
          this.logger.error(
            `Malformed ASSIGN_DRIVER payload for job ${String(job.id)}: ${safeJson(job.data)}`,
          );
          throw new Error('Malformed ASSIGN_DRIVER payload');
        }
        await this.dispatchService.handleAssignDriver(job.data);
        return;
      }
      case DispatchJobName.DISPATCH_TIMEOUT: {
        const timeoutOrderId = getOrderId(job.data);
        this.logger.debug(
          `Processing DISPATCH_TIMEOUT job ${String(job.id)} for order ${timeoutOrderId ?? 'unknown'}`,
        );
        if (!isDispatchTimeoutJob(job.data)) {
          this.logger.error(
            `Malformed DISPATCH_TIMEOUT payload for job ${String(job.id)}: ${safeJson(job.data)}`,
          );
          throw new Error('Malformed DISPATCH_TIMEOUT payload');
        }
        await this.dispatchService.handleDispatchTimeout(job.data);
        return;
      }
      default: {
        const exhaustive: never = job.name;
        this.logger.warn(`Unhandled dispatch job name: ${String(exhaustive)}`);
        return;
      }
    }
  }
}

const isDispatchJobName = (value: string): value is DispatchJobName => {
  return Object.values<string>(DispatchJobName).includes(value);
};

const isAssignDriverJob = (
  value: DispatchJobPayload,
): value is AssignDriverJobDto => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'orderId' in value &&
    typeof value.orderId === 'string' &&
    !('driverId' in value)
  );
};

const getOrderId = (value: DispatchJobPayload): string | undefined => {
  return typeof value === 'object' &&
    value !== null &&
    'orderId' in value &&
    typeof value.orderId === 'string'
    ? value.orderId
    : undefined;
};

const isDispatchTimeoutJob = (
  value: DispatchJobPayload,
): value is DispatchTimeoutJobDto => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'orderId' in value &&
    typeof value.orderId === 'string' &&
    'driverId' in value &&
    typeof value.driverId === 'string'
  );
};

const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable payload]';
  }
};
