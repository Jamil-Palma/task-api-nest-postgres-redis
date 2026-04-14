import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegisterDto } from '../auth/dto/register.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly organizationsService: OrganizationsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
  }

  private async seedUsers() {
    try {
      const count = await this.userRepository.count();
      if (count > 0) return;

      const env = this.configService.get<string>('environment');
      const passwordHash = await bcrypt.hash('password123', 10);

      if (env === 'development') {
        await this.seedDevelopmentUsers(passwordHash);
      } else {
        await this.seedProductionUser(passwordHash);
      }
    } catch (e) {
      this.logger.error('Seeding users failed', e.stack);
    }
  }

  private async seedDevelopmentUsers(passwordHash: string) {
    const defaultOrg = await this.organizationsService.findByName('Default Corp');
    const acmeOrg = await this.organizationsService.findByName('Acme Global');

    if (!defaultOrg || !acmeOrg) {
      this.logger.warn('Seeding users skipped: Dev Organizations not found.');
      return;
    }

    const devUsers = this.userRepository.create([
      {
        email: 'admin@default.com',
        passwordHash,
        role: UserRole.ADMIN,
        organization: defaultOrg,
        organizationId: defaultOrg.id,
      },
      {
        email: 'user@default.com',
        passwordHash,
        role: UserRole.USER,
        organization: defaultOrg,
        organizationId: defaultOrg.id,
      },
      {
        email: 'admin@acme.com',
        passwordHash,
        role: UserRole.ADMIN,
        organization: acmeOrg,
        organizationId: acmeOrg.id,
      },
    ]);

    await this.userRepository.save(devUsers);
    this.logger.log('Development users seeded successfully (Passwords: password123).');
  }

  private async seedProductionUser(passwordHash: string) {
    const org = await this.organizationsService.findDefaultOrganization();
    if (!org) {
      this.logger.warn('Seeding user skipped: Default Organization not found.');
      return;
    }

    const user = this.userRepository.create({
      email: 'admin@default.com',
      passwordHash,
      role: UserRole.ADMIN,
      organization: org,
      organizationId: org.id,
    });

    await this.userRepository.save(user);
    this.logger.log('Default user seeded: admin@default.com');
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  async create(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.findOneByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const defaultOrg = await this.organizationsService.findDefaultOrganization();
    if (!defaultOrg) {
      throw new Error('Organización por defecto no encontrada. Ejecute el seeding.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: registerDto.email,
      passwordHash,
      role: UserRole.USER,
      organization: defaultOrg,
      organizationId: defaultOrg.id,
    });

    return this.userRepository.save(user);
  }
}