import { 
  EntitySubscriberInterface, 
  EventSubscriber, 
  UpdateEvent, 
  SoftRemoveEvent,
  InsertEvent,
  DataSource 
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<Task> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Task;
  }

  async afterInsert(event: InsertEvent<Task>) {
    const auditRepository = event.manager.getRepository(AuditLog);
    
    const audit = auditRepository.create({
      entityName: 'tasks',
      entityId: event.entity.id,
      action: AuditAction.CREATE,
      userId: event.entity.createdBy,
      organizationId: event.entity.organizationId,
      newValues: event.entity,
    });

    await auditRepository.save(audit);
  }

  async afterUpdate(event: UpdateEvent<Task>) {
    if (!event.entity || !event.databaseEntity) return;

    const auditRepository = event.manager.getRepository(AuditLog);
    
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    event.updatedColumns.forEach((column) => {
      const propertyName = column.propertyName;
      oldValues[propertyName] = event.databaseEntity[propertyName as keyof Task];
      newValues[propertyName] = event.entity![propertyName as keyof Task];
    });

    if (Object.keys(newValues).length === 0) return;

    const audit = auditRepository.create({
      entityName: 'tasks',
      entityId: event.entity.id,
      action: AuditAction.UPDATE,
      userId: event.entity.createdBy,
      organizationId: event.entity.organizationId,
      oldValues,
      newValues,
    });

    await auditRepository.save(audit);
  }

  async afterSoftRemove(event: SoftRemoveEvent<Task>) {
    if (!event.entity) return;

    const auditRepository = event.manager.getRepository(AuditLog);
    
    const audit = auditRepository.create({
      entityName: 'tasks',
      entityId: event.entity.id,
      action: AuditAction.DELETE,
      userId: event.entity.createdBy,
      organizationId: event.entity.organizationId,
      oldValues: event.entity,
    });

    await auditRepository.save(audit);
  }
}