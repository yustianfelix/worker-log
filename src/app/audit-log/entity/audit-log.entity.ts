import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EmployeeChangedField = 'photo' | 'phoneNumber' | 'password';

@Entity({ name: 'audit_log' })
export class AuditLog {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', name: 'audit_log_id' })
  auditLogId: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'event_id' })
  eventId: string;

  @Column({ type: 'varchar', length: 255, name: 'event_type' })
  eventType: 'employee.profile.updated';

  @Column({ type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'jsonb', name: 'changed_fields' })
  changedFields: EmployeeChangedField[];

  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
