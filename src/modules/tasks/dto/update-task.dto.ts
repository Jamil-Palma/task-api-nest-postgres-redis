import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../entities/task.entity';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ 
    enum: TaskStatus, 
    example: TaskStatus.IN_PROGRESS,
    description: 'Current progress status' 
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ 
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the user assigned to this task' 
  })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}