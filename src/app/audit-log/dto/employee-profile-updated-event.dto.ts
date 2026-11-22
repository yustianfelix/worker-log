export type EmployeeChangedField = 'photo' | 'phoneNumber' | 'password';

export interface EmployeeProfileUpdatedEvent {
  eventId: string;
  eventType: 'employee.profile.updated';
  employeeId: string;
  changedFields: EmployeeChangedField[];
  occurredAt: string;
}
