import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type CurrentUserData = string | undefined;

export const CurrentUser = createParamDecorator(
  (data: CurrentUserData, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> }>();
    if (!request.user) return undefined;
    return data ? request.user[data] : request.user;
  },
);
