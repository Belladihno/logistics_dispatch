import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; docs: string } {
    return {
      message: 'Hello World!',
      docs: '/docs',
    };
  }
}
