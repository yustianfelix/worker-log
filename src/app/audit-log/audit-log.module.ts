import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeAuditLogConsumer } from './employee-audit-log.consumer';
import { AuditLog } from './entity/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [EmployeeAuditLogConsumer],
})
export class AuditLogModule {}
