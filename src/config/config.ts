import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME ?? 'postgres',
  },
  appEnv: {
    applicationPort: Number(process.env.PORT ?? 3000),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean),
    employeeAuditTopic:
      process.env.KAFKA_EMPLOYEE_AUDIT_TOPIC ?? 'employee.log',
    groupId: process.env.KAFKA_EMPLOYEE_AUDIT_GROUP_ID ?? 'worker-log-audit',
  },
}));
