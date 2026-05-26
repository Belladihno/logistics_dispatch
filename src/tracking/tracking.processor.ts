import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TRACKING_QUEUE } from './constants/tracking.constants';
import { TrackingService } from './tracking.service';
import { RecalculateEtaJobDto } from './dto/tracking-job.dto';

type TrackingJobPayload = RecalculateEtaJobDto;

@Processor(TRACKING_QUEUE)
export class TrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackingProcessor.name);

  constructor(private readonly trackingService: TrackingService) {
    super();
  }

  async process(job: Job<TrackingJobPayload>): Promise<void> {
    switch (job.name) {
      case 'recalculate_eta': {
        const { orderId, driverProfileId } = job.data;
        this.logger.debug(`Processing RECALCULATE_ETA for order ${orderId}`);
        await this.trackingService.handleEtaRecalculation(
          orderId,
          driverProfileId,
        );
        return;
      }
      default: {
        this.logger.warn(`Unhandled tracking job name: ${String(job.name)}`);
        return;
      }
    }
  }
}
