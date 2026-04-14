import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedOrganizations();
  }

  private async seedOrganizations() {
    const count = await this.organizationRepository.count();
    if (count > 0) return; // Skip if already seeded

    const env = this.configService.get<string>('environment');

    if (env === 'development') {
      // Seed multiple organizations for local development
      const orgs = this.organizationRepository.create([
        { name: 'Default Corp' },
        { name: 'Acme Global' },
        { name: 'Tech Solutions Inc' },
      ]);
      await this.organizationRepository.save(orgs);
      this.logger.log('Development organizations seeded successfully.');
    } else {
      // Seed base organization for production or test environments
      const org = this.organizationRepository.create({
        name: 'Default Corp',
      });
      await this.organizationRepository.save(org);
      this.logger.log('Default organization seeded successfully.');
    }
  }

  async findDefaultOrganization(): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { name: 'Default Corp' } });
  }

  async findByName(name: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { name } });
  }
}