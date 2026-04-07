import { SetMetadata } from '@nestjs/common';

export const RequirePermission = (code: string) => SetMetadata('permission', code);
