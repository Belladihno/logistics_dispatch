export const TRACKING_QUEUE = 'tracking-queue';

export const TRACKING_QUEUE_CONFIG = {
  name: TRACKING_QUEUE,
};

export enum TrackingJobName {
  RECALCULATE_ETA = 'recalculate_eta',
}

export const ACTIVE_ORDER_KEY = (driverProfileId: string) =>
  `tracking:active_order:${driverProfileId}`;

export const ETA_JOB_KEY = (orderId: string) => `tracking:eta_job:${orderId}`;
export const ETA_RECALCULATE_DELAY_MS = 30_000; // 30 seconds
export const ETA_AVERAGE_SPEED_KMH = 30; // default average speed for ETA calculation
