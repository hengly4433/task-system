import { DependencyResponseDto } from './dto';

type DependencyModel = {
  dependencyId: bigint;
  taskId: bigint;
  dependentTaskId: bigint;
};

export class DependenciesMapper {
  static toResponse(dep: DependencyModel): DependencyResponseDto {
    return {
      dependencyId: dep.dependencyId.toString(),
      taskId: dep.taskId.toString(),
      dependentTaskId: dep.dependentTaskId.toString(),
    };
  }

  static toResponseList(deps: DependencyModel[]): DependencyResponseDto[] {
    return deps.map((d) => this.toResponse(d));
  }
}
