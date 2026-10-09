import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const ApiCsrfHeader = () =>
  applyDecorators(
    ApiHeader({
      name: 'x-csrf-token',
      required: true,
      description: 'Token from GET /api/csrf',
    }),
  );