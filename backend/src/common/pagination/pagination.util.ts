import { PaginatedResult, PaginationDto } from './pagination.dto';

export function getPaginationParams(dto: PaginationDto): { skip: number; take: number } {
  const page = dto.page || 1;
  const pageSize = dto.pageSize || 10;
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function getSortParams(dto: PaginationDto, allowedFields: string[]): { orderBy?: Record<string, 'asc' | 'desc'> } {
  if (dto.sortBy && allowedFields.includes(dto.sortBy)) {
    return {
      orderBy: {
        [dto.sortBy]: dto.sortDir || 'asc',
      },
    };
  }
  return {};
}

export function createPaginatedResult<T>(
  data: T[],
  totalItems: number,
  dto: PaginationDto,
): PaginatedResult<T> {
  const page = dto.page || 1;
  const pageSize = dto.pageSize || 10;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
