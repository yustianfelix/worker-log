import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Consumer, stringDeserializers } from '@platformatic/kafka';
import type { MessagesStream } from '@platformatic/kafka';
import { Repository } from 'typeorm';
import type { EmployeeProfileUpdatedEvent } from './dto/employee-profile-updated-event.dto';
import { AuditLog } from './entity/audit-log.entity';

@Injectable()
export class EmployeeAuditLogConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmployeeAuditLogConsumer.name);
  private readonly consumer: Consumer<string, string, string, string>;
  private readonly topic: string;
  private stream: MessagesStream<string, string, string, string> | null = null;
  private consuming = false;

  constructor(
    config: ConfigService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    this.topic =
      config.get<string>('app.kafka.employeeAuditTopic') ?? 'employee.log';
    this.consumer = new Consumer({
      groupId:
        config.get<string>('app.kafka.groupId') ?? 'worker-log-audit',
      clientId: 'worker-log',
      bootstrapBrokers:
        config.get<string[]>('app.kafka.brokers') ?? ['localhost:9092'],
      deserializers: stringDeserializers,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      this.stream = await this.consumer.consume({
        topics: [this.topic],
        autocommit: false,
        sessionTimeout: 10_000,
        heartbeatInterval: 500,
      });
      this.consuming = true;
      this.logger.log(
        `Listening for employee audit events on topic ${this.topic}`,
      );
      void this.consumeMessages();
    } catch (error) {
      this.logger.error(
        `Failed to start employee audit consumer for topic ${this.topic}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async consumeMessages(): Promise<void> {
    if (!this.stream) return;

    try {
      for await (const message of this.stream) {
        if (!this.consuming) break;
        try {
          await this.persistMessage(message.value);
          await message.commit();
        } catch (error) {
          this.logger.error(
            `Failed to persist employee audit event at offset ${message.offset}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Employee audit consumer stopped after a processing error',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async persistMessage(value: string | undefined): Promise<void> {
    if (!value) throw new Error('Kafka message value is empty');

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error('Kafka message value is not valid JSON');
    }

    const event = this.validateEvent(parsed);
    const existing = await this.auditLogRepository.findOne({
      where: { eventId: event.eventId },
    });
    if (existing) {
      this.logger.warn(`Duplicate audit event ignored: ${event.eventId}`);
      return;
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        eventId: event.eventId,
        eventType: event.eventType,
        employeeId: event.employeeId,
        changedFields: event.changedFields,
        occurredAt: new Date(event.occurredAt),
      }),
    );
  }

  private validateEvent(value: unknown): EmployeeProfileUpdatedEvent {
    if (!value || typeof value !== 'object') {
      throw new Error('Kafka audit event must be an object');
    }

    const event = value as Record<string, unknown>;
    const allowedFields = new Set(['photo', 'phoneNumber', 'password']);
    if (
      typeof event.eventId !== 'string' ||
      event.eventId.length === 0 ||
      event.eventType !== 'employee.profile.updated' ||
      typeof event.employeeId !== 'string' ||
      event.employeeId.length === 0 ||
      !Array.isArray(event.changedFields) ||
      event.changedFields.length === 0 ||
      !event.changedFields.every(
        (field) =>
          typeof field === 'string' && allowedFields.has(field),
      ) ||
      typeof event.occurredAt !== 'string' ||
      Number.isNaN(Date.parse(event.occurredAt))
    ) {
      throw new Error('Kafka audit event has an invalid payload');
    }

    return event as unknown as EmployeeProfileUpdatedEvent;
  }

  async onModuleDestroy(): Promise<void> {
    this.consuming = false;
    if (this.stream) await this.stream.close();
    await this.consumer.close();
  }
}
