import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface PrismaErrorResult {
  statusCode: HttpStatus;
  message: string;
}

export function mapPrismaErrorToHttp(error: unknown): HttpException {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        return new HttpException(
          { statusCode: HttpStatus.CONFLICT, message: `Unique constraint violation on: ${target}` },
          HttpStatus.CONFLICT,
        );
      case 'P2025': // Record not found
        return new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Record not found' },
          HttpStatus.NOT_FOUND,
        );
      case 'P2003': // Foreign key constraint violation
        return new HttpException(
          { statusCode: HttpStatus.BAD_REQUEST, message: 'Foreign key constraint violation' },
          HttpStatus.BAD_REQUEST,
        );
      case 'P2014': // Required relation violation
        return new HttpException(
          { statusCode: HttpStatus.BAD_REQUEST, message: 'Required relation violation' },
          HttpStatus.BAD_REQUEST,
        );
      default:
        return new HttpException(
          { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new HttpException(
      { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid input data' },
      HttpStatus.BAD_REQUEST,
    );
  }

  return new HttpException(
    { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
