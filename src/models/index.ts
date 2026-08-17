import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';

// Standard TypeScript string enums corresponding to Prisma enums
export enum Role {
  ADMIN = 'ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  VICE_PRINCIPAL = 'VICE_PRINCIPAL',
  TEACHER = 'TEACHER',
  STAFF = 'STAFF',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED_BY_TEACHER = 'APPROVED_BY_TEACHER',
  APPROVED_BY_VP = 'APPROVED_BY_VP',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum LeaveType {
  SICK = 'SICK',
  CASUAL = 'CASUAL',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  UNPAID = 'UNPAID'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export enum NoticeTarget {
  ALL = 'ALL',
  TEACHERS = 'TEACHERS',
  PARENTS = 'PARENTS',
  STAFF = 'STAFF',
  CLASS = 'CLASS',
  DIVISION = 'DIVISION'
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum AssessmentType {
  HOMEWORK = 'HOMEWORK',
  ASSIGNMENT = 'ASSIGNMENT',
  PROJECT = 'PROJECT',
  QUIZ = 'QUIZ'
}

export enum AssessmentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED'
}

export enum IssueCategory {
  ACADEMIC = 'ACADEMIC',
  BEHAVIOUR = 'BEHAVIOUR',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  TEACHER_CONCERN = 'TEACHER_CONCERN',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER'
}

// Common options to ensure virtuals are returned when converting documents to JSON/Object
const schemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc: any, ret: any) => {
      if (ret._id) {
        ret.id = ret._id;
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc: any, ret: any) => {
      if (ret._id) {
        ret.id = ret._id;
      }
      return ret;
    }
  }
};

// 1. CustomRole Schema
const CustomRoleSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true, unique: true },
  description: { type: String }
}, schemaOptions);

CustomRoleSchema.virtual('permissions', { ref: 'Permission', localField: '_id', foreignField: 'roleId' });

// 2. Permission Schema
const PermissionSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  feature: { type: String, required: true },
  accessType: { type: String, required: true },
  roleId: { type: String, ref: 'CustomRole', required: true }
}, schemaOptions);
PermissionSchema.index({ roleId: 1, feature: 1 }, { unique: true });

// 3. User Schema
const UserSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(Role), required: true, index: true },
  status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING_APPROVAL },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  profileImage: { type: String },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  customRoleId: { type: String, ref: 'CustomRole' }
}, schemaOptions);

// User Virtual Populates for Profiles
UserSchema.virtual('adminProfile', { ref: 'AdminProfile', localField: '_id', foreignField: 'userId', justOne: true });
UserSchema.virtual('principalProfile', { ref: 'PrincipalProfile', localField: '_id', foreignField: 'userId', justOne: true });
UserSchema.virtual('vpProfile', { ref: 'VicePrincipalProfile', localField: '_id', foreignField: 'userId', justOne: true });
UserSchema.virtual('teacherProfile', { ref: 'TeacherProfile', localField: '_id', foreignField: 'userId', justOne: true });
UserSchema.virtual('staffProfile', { ref: 'StaffProfile', localField: '_id', foreignField: 'userId', justOne: true });
UserSchema.virtual('parentProfile', { ref: 'ParentProfile', localField: '_id', foreignField: 'userId', justOne: true });
UserSchema.virtual('studentProfile', { ref: 'StudentProfile', localField: '_id', foreignField: 'userId', justOne: true });
UserSchema.virtual('customRole', { ref: 'CustomRole', localField: 'customRoleId', foreignField: '_id', justOne: true });

// 4. RefreshToken Schema
const RefreshTokenSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  token: { type: String, required: true, unique: true },
  userId: { type: String, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true }
}, schemaOptions);

RefreshTokenSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });

// 5. AdminProfile Schema
const AdminProfileSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, unique: true, index: true }
}, schemaOptions);

// 6. PrincipalProfile Schema
const PrincipalProfileSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, unique: true, index: true }
}, schemaOptions);

// 7. VicePrincipalProfile Schema
const VicePrincipalProfileSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, unique: true, index: true }
}, schemaOptions);

// 8. TeacherProfile Schema
const TeacherProfileSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, unique: true, index: true },
  employeeId: { type: String, required: true, unique: true },
  qualification: { type: String, required: true },
  specialization: { type: String, required: true }
}, schemaOptions);

TeacherProfileSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
TeacherProfileSchema.virtual('classrooms', { ref: 'Classroom', localField: '_id', foreignField: 'teacherIds' });
TeacherProfileSchema.virtual('subjects', { ref: 'SubjectTeacher', localField: '_id', foreignField: 'teacherId' });
TeacherProfileSchema.virtual('schedules', { ref: 'Schedule', localField: '_id', foreignField: 'teacherId' });
TeacherProfileSchema.virtual('leaveRequests', { ref: 'LeaveRequest', localField: '_id', foreignField: 'userId' });

// 9. StaffProfile Schema
const StaffProfileSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, unique: true, index: true },
  employeeId: { type: String, required: true, unique: true },
  roleType: { type: String, required: true }
}, schemaOptions);

StaffProfileSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
StaffProfileSchema.virtual('assignedRoute', { ref: 'BusRoute', localField: '_id', foreignField: 'driverId', justOne: true });
StaffProfileSchema.virtual('leaveRequests', { ref: 'LeaveRequest', localField: '_id', foreignField: 'userId' });

// 10. ParentProfile Schema
const ParentProfileSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, unique: true, index: true },
  profession: { type: String },
  address: { type: String, required: true }
}, schemaOptions);

ParentProfileSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
ParentProfileSchema.virtual('students', { ref: 'StudentProfile', localField: '_id', foreignField: 'parentId' });
ParentProfileSchema.virtual('leaveRequests', { ref: 'LeaveRequest', localField: '_id', foreignField: 'userId' });

// 11. Classroom Schema
const ClassroomSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  gradeLevel: { type: Number, required: true },
  division: { type: String, enum: ['PRE_PRIMARY', 'PRIMARY'], default: 'PRIMARY' },
  teacherId: { type: String, ref: 'TeacherProfile', index: true },
  teacherIds: { type: [String], ref: 'TeacherProfile', default: [], index: true }
}, schemaOptions);

ClassroomSchema.virtual('teachers', { ref: 'TeacherProfile', localField: 'teacherIds', foreignField: '_id' });
ClassroomSchema.virtual('teacher', { ref: 'TeacherProfile', localField: 'teacherIds', foreignField: '_id', justOne: true });
ClassroomSchema.virtual('students', { ref: 'StudentProfile', localField: '_id', foreignField: 'classroomId' });
ClassroomSchema.virtual('schedules', { ref: 'Schedule', localField: '_id', foreignField: 'classroomId' });
ClassroomSchema.virtual('notices', { ref: 'Notice', localField: '_id', foreignField: 'classroomId' });
ClassroomSchema.virtual('moments', { ref: 'Moment', localField: '_id', foreignField: 'classroomId' });
ClassroomSchema.virtual('courses', { ref: 'Course', localField: '_id', foreignField: 'classroomId' });

// 12. Subject Schema
const SubjectSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true }
}, schemaOptions);

SubjectSchema.virtual('teachers', { ref: 'SubjectTeacher', localField: '_id', foreignField: 'subjectId' });
SubjectSchema.virtual('schedules', { ref: 'Schedule', localField: '_id', foreignField: 'subjectId' });
SubjectSchema.virtual('courses', { ref: 'Course', localField: '_id', foreignField: 'subjectId' });

// 13. SubjectTeacher Schema
const SubjectTeacherSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  teacherId: { type: String, ref: 'TeacherProfile', required: true },
  subjectId: { type: String, ref: 'Subject', required: true }
}, schemaOptions);
SubjectTeacherSchema.index({ teacherId: 1, subjectId: 1 }, { unique: true });

SubjectTeacherSchema.virtual('teacher', { ref: 'TeacherProfile', localField: 'teacherId', foreignField: '_id', justOne: true });
SubjectTeacherSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });

// 14. StudentProfile Schema
const StudentProfileSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, unique: true, index: true },
  admissionNo: { type: String, required: true, unique: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: Object.values(Gender), required: true },
  classroomId: { type: String, ref: 'Classroom', required: true, index: true },
  parentId: { type: String, ref: 'ParentProfile', required: true, index: true },
  busRouteId: { type: String, ref: 'BusRoute', index: true }
}, schemaOptions);

StudentProfileSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
StudentProfileSchema.virtual('classroom', { ref: 'Classroom', localField: 'classroomId', foreignField: '_id', justOne: true });
StudentProfileSchema.virtual('parent', { ref: 'ParentProfile', localField: 'parentId', foreignField: '_id', justOne: true });
StudentProfileSchema.virtual('busRoute', { ref: 'BusRoute', localField: 'busRouteId', foreignField: '_id', justOne: true });
StudentProfileSchema.virtual('attendance', { ref: 'Attendance', localField: '_id', foreignField: 'studentId' });
StudentProfileSchema.virtual('grades', { ref: 'GradeReport', localField: '_id', foreignField: 'studentId' });
StudentProfileSchema.virtual('leaveRequests', { ref: 'LeaveRequest', localField: '_id', foreignField: 'userId' });
StudentProfileSchema.virtual('busAttendance', { ref: 'BusAttendance', localField: '_id', foreignField: 'studentId' });

// 15. Schedule Schema
const ScheduleSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  classroomId: { type: String, ref: 'Classroom', required: true, index: true },
  subjectId: { type: String, ref: 'Subject', required: true },
  teacherId: { type: String, ref: 'TeacherProfile', required: true, index: true },
  dayOfWeek: { type: Number, required: true },
  startTime: { type: String, required: true }, // HH:MM
  endTime: { type: String, required: true }, // HH:MM
  roomNo: { type: String }
}, schemaOptions);

ScheduleSchema.virtual('classroom', { ref: 'Classroom', localField: 'classroomId', foreignField: '_id', justOne: true });
ScheduleSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
ScheduleSchema.virtual('teacher', { ref: 'TeacherProfile', localField: 'teacherId', foreignField: '_id', justOne: true });

// 16. Attendance Schema
const AttendanceSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  studentId: { type: String, ref: 'StudentProfile' },
  teacherId: { type: String, ref: 'User' },
  date: { type: Date, required: true, index: true },
  status: { type: String, enum: Object.values(AttendanceStatus), required: true },
  remarks: { type: String },
  recordedById: { type: String, ref: 'User', required: true }
}, schemaOptions);

// Duplicate attendance checks
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true, sparse: true });
AttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true, sparse: true });

AttendanceSchema.virtual('student', { ref: 'StudentProfile', localField: 'studentId', foreignField: '_id', justOne: true });
AttendanceSchema.virtual('teacher', { ref: 'User', localField: 'teacherId', foreignField: '_id', justOne: true });

// 17. LeaveRequest Schema
const LeaveRequestSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: 'User', required: true, index: true },
  userRole: { type: String, enum: Object.values(Role), required: true },
  leaveType: { type: String, enum: Object.values(LeaveType), required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: Object.values(LeaveStatus), default: LeaveStatus.PENDING, index: true },
  rejectionReason: { type: String },
  assignedTeacherId: { type: String, ref: 'TeacherProfile' },
  assignedVPId: { type: String },
  assignedPrincipalId: { type: String },
  parentProfileId: { type: String, ref: 'ParentProfile' },
  staffProfileId: { type: String, ref: 'StaffProfile' },
  studentProfileId: { type: String, ref: 'StudentProfile' }
}, schemaOptions);

LeaveRequestSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
LeaveRequestSchema.virtual('assignedTeacher', { ref: 'TeacherProfile', localField: 'assignedTeacherId', foreignField: '_id', justOne: true });
LeaveRequestSchema.virtual('parentProfile', { ref: 'ParentProfile', localField: 'parentProfileId', foreignField: '_id', justOne: true });
LeaveRequestSchema.virtual('staffProfile', { ref: 'StaffProfile', localField: 'staffProfileId', foreignField: '_id', justOne: true });
LeaveRequestSchema.virtual('studentProfile', { ref: 'StudentProfile', localField: 'studentProfileId', foreignField: '_id', justOne: true });

// 18. GradeReport Schema
const GradeReportSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  studentId: { type: String, ref: 'StudentProfile', required: true, index: true },
  term: { type: String, required: true },
  academicYear: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  score: { type: Number, required: true },
  remarks: { type: String },
  publishedAt: { type: Date, default: Date.now }
}, schemaOptions);

GradeReportSchema.virtual('student', { ref: 'StudentProfile', localField: 'studentId', foreignField: '_id', justOne: true });

// 19. BusRoute Schema
const BusRouteSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  routeName: { type: String, required: true },
  routeNo: { type: String, required: true, unique: true },
  startPoint: { type: String, required: true },
  endPoint: { type: String, required: true },
  driverId: { type: String, ref: 'StaffProfile', unique: true, sparse: true },
  latitude: { type: Number },
  longitude: { type: Number },
  lastUpdated: { type: Date },
  etaMinutes: { type: Number }
}, schemaOptions);

BusRouteSchema.virtual('driver', { ref: 'StaffProfile', localField: 'driverId', foreignField: '_id', justOne: true });
BusRouteSchema.virtual('students', { ref: 'StudentProfile', localField: '_id', foreignField: 'busRouteId' });
BusRouteSchema.virtual('attendance', { ref: 'BusAttendance', localField: '_id', foreignField: 'busRouteId' });

// 20. BusAttendance Schema
const BusAttendanceSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  busRouteId: { type: String, ref: 'BusRoute', required: true, index: true },
  studentId: { type: String, ref: 'StudentProfile', required: true, index: true },
  date: { type: Date, default: Date.now },
  type: { type: String, required: true }, // PICKUP or DROP
  status: { type: String, enum: Object.values(AttendanceStatus), required: true },
  recordedAt: { type: Date, default: Date.now }
}, schemaOptions);

BusAttendanceSchema.virtual('busRoute', { ref: 'BusRoute', localField: 'busRouteId', foreignField: '_id', justOne: true });
BusAttendanceSchema.virtual('student', { ref: 'StudentProfile', localField: 'studentId', foreignField: '_id', justOne: true });

// 21. Notice Schema
const NoticeSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  title: { type: String, required: true },
  content: { type: String, required: true },
  target: { type: String, enum: Object.values(NoticeTarget), required: true, index: true },
  classroomId: { type: String, ref: 'Classroom' },
  division: { type: String, enum: ['PRE_PRIMARY', 'PRIMARY'] },
  authorId: { type: String, ref: 'TeacherProfile', required: true }
}, schemaOptions);

NoticeSchema.virtual('classroom', { ref: 'Classroom', localField: 'classroomId', foreignField: '_id', justOne: true });
NoticeSchema.virtual('author', { ref: 'TeacherProfile', localField: 'authorId', foreignField: '_id', justOne: true });

// 22. Moment Schema
const MomentSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  caption: { type: String, required: true },
  mediaUrl: { type: String, required: true },
  classroomId: { type: String, ref: 'Classroom', required: true, index: true },
  teacherId: { type: String, ref: 'TeacherProfile', required: true }
}, schemaOptions);

MomentSchema.virtual('classroom', { ref: 'Classroom', localField: 'classroomId', foreignField: '_id', justOne: true });
MomentSchema.virtual('teacher', { ref: 'TeacherProfile', localField: 'teacherId', foreignField: '_id', justOne: true });

// 23. Event Schema
const EventSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  title: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String },
  target: { type: String, enum: ['ALL', 'DIVISION', 'CLASS'], default: 'ALL', index: true },
  division: { type: String, enum: ['PRE_PRIMARY', 'PRIMARY'] },
  classroomId: { type: String, ref: 'Classroom' }
}, schemaOptions);

// 24. Notification Schema
const NotificationSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  title: { type: String, required: true },
  message: { type: String, required: true },
  channel: { type: String, required: true }, // "IN_APP", "EMAIL", "SMS", "PUSH", "ALL"
  senderId: { type: String, ref: 'User' }
}, schemaOptions);

NotificationSchema.virtual('sender', { ref: 'User', localField: 'senderId', foreignField: '_id', justOne: true });
NotificationSchema.virtual('recipients', { ref: 'NotificationRecipient', localField: '_id', foreignField: 'notificationId' });

// 25. NotificationRecipient Schema
const NotificationRecipientSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  notificationId: { type: String, ref: 'Notification', required: true },
  recipientId: { type: String, ref: 'User', required: true, index: true },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date }
}, schemaOptions);

NotificationRecipientSchema.virtual('notification', { ref: 'Notification', localField: 'notificationId', foreignField: '_id', justOne: true });
NotificationRecipientSchema.virtual('recipient', { ref: 'User', localField: 'recipientId', foreignField: '_id', justOne: true });

// 26. AISession Schema
const AISessionSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, required: true, index: true }
}, schemaOptions);

AISessionSchema.virtual('messages', { ref: 'AIMessage', localField: '_id', foreignField: 'sessionId' });

// 27. AIMessage Schema
const AIMessageSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  sessionId: { type: String, ref: 'AISession', required: true, index: true },
  role: { type: String, required: true }, // "user" or "assistant"
  content: { type: String, required: true }
}, schemaOptions);

AIMessageSchema.virtual('session', { ref: 'AISession', localField: 'sessionId', foreignField: '_id', justOne: true });

// 28. Course Schema
const CourseSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  title: { type: String, required: true },
  description: { type: String },
  classroomId: { type: String, ref: 'Classroom', required: true, index: true },
  teacherId: { type: String, ref: 'TeacherProfile', required: true, index: true },
  subjectId: { type: String, ref: 'Subject', required: true, index: true }
}, schemaOptions);

CourseSchema.virtual('classroom', { ref: 'Classroom', localField: 'classroomId', foreignField: '_id', justOne: true });
CourseSchema.virtual('teacher', { ref: 'TeacherProfile', localField: 'teacherId', foreignField: '_id', justOne: true });
CourseSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
CourseSchema.virtual('modules', { ref: 'CourseModule', localField: '_id', foreignField: 'courseId' });

// 29. CourseModule Schema
const CourseModuleSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  courseId: { type: String, ref: 'Course', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, default: 0 },
  content: { type: String }
}, schemaOptions);

CourseModuleSchema.virtual('course', { ref: 'Course', localField: 'courseId', foreignField: '_id', justOne: true });

// 30. Issue Schema
const IssueSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: Object.values(IssueCategory), required: true, index: true },
  status: { type: String, enum: Object.values(IssueStatus), default: IssueStatus.OPEN, index: true },
  priority: { type: String, default: 'MEDIUM' }, // LOW, MEDIUM, HIGH
  raisedById: { type: String, required: true, index: true },
  raisedByRole: { type: String, enum: Object.values(Role), required: true },
  resolvedById: { type: String },
  resolvedAt: { type: Date },
  resolution: { type: String },
  studentId: { type: String }
}, schemaOptions);

// 31. Assessment Schema
const AssessmentSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: Object.values(AssessmentType), default: AssessmentType.HOMEWORK, index: true },
  classroomId: { type: String, ref: 'Classroom', required: true, index: true },
  teacherId: { type: String, ref: 'TeacherProfile', required: true, index: true },
  subjectId: { type: String, ref: 'Subject', required: true, index: true },
  dueDate: { type: Date, required: true },
  maxMarks: { type: Number, default: 100 },
  attachmentUrl: { type: String }
}, schemaOptions);

AssessmentSchema.virtual('classroom', { ref: 'Classroom', localField: 'classroomId', foreignField: '_id', justOne: true });
AssessmentSchema.virtual('teacher', { ref: 'TeacherProfile', localField: 'teacherId', foreignField: '_id', justOne: true });
AssessmentSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
AssessmentSchema.virtual('submissions', { ref: 'AssessmentSubmission', localField: '_id', foreignField: 'assessmentId' });

// 32. AssessmentSubmission Schema
const AssessmentSubmissionSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  assessmentId: { type: String, ref: 'Assessment', required: true, index: true },
  studentId: { type: String, ref: 'StudentProfile', required: true, index: true },
  status: { type: String, enum: Object.values(AssessmentStatus), default: AssessmentStatus.PENDING, index: true },
  submissionText: { type: String },
  score: { type: Number },
  remarks: { type: String },
  submittedAt: { type: Date }
}, schemaOptions);

AssessmentSubmissionSchema.virtual('assessment', { ref: 'Assessment', localField: 'assessmentId', foreignField: '_id', justOne: true });
AssessmentSubmissionSchema.virtual('student', { ref: 'StudentProfile', localField: 'studentId', foreignField: '_id', justOne: true });

// Define Models
export const CustomRole = mongoose.models.CustomRole || mongoose.model('CustomRole', CustomRoleSchema);
export const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', RefreshTokenSchema);
export const AdminProfile = mongoose.models.AdminProfile || mongoose.model('AdminProfile', AdminProfileSchema);
export const PrincipalProfile = mongoose.models.PrincipalProfile || mongoose.model('PrincipalProfile', PrincipalProfileSchema);
export const VicePrincipalProfile = mongoose.models.VicePrincipalProfile || mongoose.model('VicePrincipalProfile', VicePrincipalProfileSchema);
export const TeacherProfile = mongoose.models.TeacherProfile || mongoose.model('TeacherProfile', TeacherProfileSchema);
export const StaffProfile = mongoose.models.StaffProfile || mongoose.model('StaffProfile', StaffProfileSchema);
export const ParentProfile = mongoose.models.ParentProfile || mongoose.model('ParentProfile', ParentProfileSchema);
export const Classroom = mongoose.models.Classroom || mongoose.model('Classroom', ClassroomSchema);
export const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
export const SubjectTeacher = mongoose.models.SubjectTeacher || mongoose.model('SubjectTeacher', SubjectTeacherSchema);
export const StudentProfile = mongoose.models.StudentProfile || mongoose.model('StudentProfile', StudentProfileSchema);
export const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);
export const GradeReport = mongoose.models.GradeReport || mongoose.model('GradeReport', GradeReportSchema);
export const BusRoute = mongoose.models.BusRoute || mongoose.model('BusRoute', BusRouteSchema);
export const BusAttendance = mongoose.models.BusAttendance || mongoose.model('BusAttendance', BusAttendanceSchema);
export const Notice = mongoose.models.Notice || mongoose.model('Notice', NoticeSchema);
export const Moment = mongoose.models.Moment || mongoose.model('Moment', MomentSchema);
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const NotificationRecipient = mongoose.models.NotificationRecipient || mongoose.model('NotificationRecipient', NotificationRecipientSchema);
export const AISession = mongoose.models.AISession || mongoose.model('AISession', AISessionSchema);
export const AIMessage = mongoose.models.AIMessage || mongoose.model('AIMessage', AIMessageSchema);
export const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
export const CourseModule = mongoose.models.CourseModule || mongoose.model('CourseModule', CourseModuleSchema);
export const Issue = mongoose.models.Issue || mongoose.model('Issue', IssueSchema);
export const Assessment = mongoose.models.Assessment || mongoose.model('Assessment', AssessmentSchema);
export const AssessmentSubmission = mongoose.models.AssessmentSubmission || mongoose.model('AssessmentSubmission', AssessmentSubmissionSchema);
