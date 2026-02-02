import { PositionResponseDto } from './dto';

type PositionModel = {
  positionId: bigint;
  positionName: string;
  description: string | null;
  createdAt: Date;
};

export class PositionsMapper {
  static toResponse(position: PositionModel): PositionResponseDto {
    return {
      positionId: position.positionId.toString(),
      positionName: position.positionName,
      description: position.description,
      createdAt: position.createdAt.toISOString(),
    };
  }

  static toResponseList(positions: PositionModel[]): PositionResponseDto[] {
    return positions.map((p) => this.toResponse(p));
  }
}
