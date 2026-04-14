import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException, 
  Inject, 
  OnModuleInit, 
  Logger 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtPayload } from '../../common/decorators/get-user.decorator';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { UsersService } from '../users/users.service';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @Inject(CACHE_MANAGER) 
    private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.seedTasks();
  }

  private async seedTasks() {
    const env = this.configService.get<string>('environment');
    if (env !== 'development') return;

    const count = await this.taskRepository.count();
    if (count > 0) return;

    try {
      const adminDefault = await this.usersService.findOneByEmail('admin@default.com');
      const adminAcme = await this.usersService.findOneByEmail('admin@acme.com');

      if (!adminDefault || !adminAcme) return;

      const seedTasks = this.taskRepository.create([
        {
          title: 'Setup Project Architecture',
          description: 'Define modules and core entities',
          status: TaskStatus.DONE,
          priority: TaskPriority.URGENT,
          organizationId: adminDefault.organizationId,
          createdBy: adminDefault.id,
          assignedTo: adminDefault.id,
          tags: ['infra', 'nest'],
        },
        {
          title: 'Implement Multi-tenancy',
          description: 'Ensure data isolation between organizations',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          organizationId: adminDefault.organizationId,
          createdBy: adminDefault.id,
          assignedTo: adminDefault.id,
          tags: ['security'],
        },
        {
          title: 'Acme Branding Task',
          description: 'Review new logo for Acme Global',
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          organizationId: adminAcme.organizationId,
          createdBy: adminAcme.id,
          assignedTo: adminAcme.id,
          tags: ['design'],
        }
      ]);

      await this.taskRepository.save(seedTasks);
      this.logger.log('Development tasks seeded successfully.');
    } catch (error) {
      this.logger.error('Failed to seed tasks', error.stack);
    }
  }

  private async clearOrganizationCache(organizationId: string): Promise<void> {
    const allKey = `tasks:org:${organizationId}:all`;
    await this.cacheManager.del(allKey);
    
    Object.values(TaskStatus).forEach(async (status) => {
      await this.cacheManager.del(`tasks:org:${organizationId}:status:${status}`);
    });
  }

  async create(createTaskDto: CreateTaskDto, user: JwtPayload): Promise<Task> {
    const task = this.taskRepository.create({
      ...createTaskDto,
      organizationId: user.organizationId,
      createdBy: user.id,
      assignedTo: user.id, 
    });

    const savedTask = await this.taskRepository.save(task);
    await this.clearOrganizationCache(user.organizationId);
    return savedTask;
  }

  async findAll(user: JwtPayload, filters: GetTasksFilterDto): Promise<PaginatedResult<Task>> {
    const cacheKey = this.getDynamicCacheKey(user.organizationId, filters);
    
    const cachedResult = await this.cacheManager.get<PaginatedResult<Task>>(cacheKey);
    if (cachedResult) return cachedResult;

    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC',
      status, priority, search, startDate, endDate
    } = filters;

    const query = this.taskRepository.createQueryBuilder('task')
      .where('task.organizationId = :orgId', { orgId: user.organizationId });

    if (status) query.andWhere('task.status = :status', { status });
    if (priority) query.andWhere('task.priority = :priority', { priority });

    if (startDate) query.andWhere('task.createdAt >= :startDate', { startDate });
    if (endDate) query.andWhere('task.createdAt <= :endDate', { endDate });

    if (search) {
      query.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    query.orderBy(`task.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [tasks, total] = await query.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const result: PaginatedResult<Task> = {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    await this.cacheManager.set(cacheKey, result);

    return result;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, user: JwtPayload): Promise<Task> {
    const task = await this.findOne(id, user);

    if (task.createdBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to update this task.');
    }

    Object.assign(task, updateTaskDto);
    
    const updatedTask = await this.taskRepository.save(task);
    await this.clearOrganizationCache(user.organizationId);
    return updatedTask;
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const task = await this.findOne(id, user);

    if (task.createdBy !== user.id && user.role !== 'admin') { 
      throw new ForbiddenException('You do not have permission to delete this task.');
    }

    await this.taskRepository.softRemove(task);
    await this.clearOrganizationCache(user.organizationId);
  }

  async findOne(id: string, user: JwtPayload): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: user.organizationId },
    });
    if (!task) throw new NotFoundException(`Task with ID "${id}" not found.`);
    return task;
  }

  /**
   * Generates a unique cache key based on the specific filters applied.
   * use an MD5 hash of the DTO to handle any combination of parameters.
   */
  private getDynamicCacheKey(organizationId: string, filters: GetTasksFilterDto): string {
    const filterString = JSON.stringify(filters);
    const hash = crypto.createHash('md5').update(filterString).digest('hex');
    return `tasks:org:${organizationId}:query:${hash}`;
  }
}