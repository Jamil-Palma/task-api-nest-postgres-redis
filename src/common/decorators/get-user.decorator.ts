import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class JwtPayload {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);