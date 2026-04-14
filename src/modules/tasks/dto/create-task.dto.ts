import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsArray, 
  IsInt, 
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ 
    example: 'Implementar Caché con Redis', 
    description: 'El título principal de la tarea' 
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ 
    example: 'Configurar cache-manager con store de redis para el endpoint GET /tasks',
    description: 'Explicación detallada de la tarea' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    enum: TaskPriority, 
    example: TaskPriority.HIGH,
    description: 'Nivel de urgencia de la tarea' 
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ 
    example: 5, 
    description: 'Puntaje de complejidad (ej: Fibonacci 1, 2, 3, 5, 8)' 
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  difficulty?: number;

  @ApiPropertyOptional({ 
    example: 3.5, 
    description: 'Horas estimadas para completar la tarea' 
  })
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({ 
    type: [String], 
    example: ['backend', 'performance'],
    description: 'Etiquetas para categorización y filtrado' 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}