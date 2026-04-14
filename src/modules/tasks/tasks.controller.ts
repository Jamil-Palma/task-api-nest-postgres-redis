import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser, JwtPayload } from '../../common/decorators/get-user.decorator';
import { TaskStatus } from './entities/task.entity';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';

@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid DTO.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(
    @Body() createTaskDto: CreateTaskDto,
    @GetUser() user: JwtPayload,
  ) {
    return this.tasksService.create(createTaskDto, user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated tasks with advanced filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(
    @GetUser() user: JwtPayload,
    @Query() filters: GetTasksFilterDto,
  ) {
    return this.tasksService.findAll(user, filters);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single task by ID' })
  @ApiResponse({ status: 200, description: 'Task found.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid UUID.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Task not found in this organization.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: JwtPayload,
  ) {
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid DTO.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. You do not have permission to update this task.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: JwtPayload,
  ) {
    return this.tasksService.update(id, updateTaskDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task (Soft Delete)' })
  @ApiResponse({ status: 204, description: 'Task successfully deleted. No body returned.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid UUID.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. You do not have permission to delete this task.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: JwtPayload,
  ) {
    return this.tasksService.remove(id, user);
  }
}