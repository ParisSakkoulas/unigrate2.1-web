export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';
/** Not logged in */
export type ViewerRole = Role | 'VISITOR';
export type UserStatus = 'PENDING' | 'ACTIVE';
export type TeacherRank = 'ASSISTANT' | 'ASSOCIATE' | 'PROFESSOR';

export const TEACHER_RANKS: TeacherRank[] = ['ASSISTANT', 'ASSOCIATE', 'PROFESSOR'];

export interface User {
  id: string;
  login: string;
  role: Role;
  status: UserStatus;
  /** Department id (not set for the super admin) */
  department?: string;
  firstName: string;
  lastName: string;
  /** Id of the Teacher / Student record */
  profileId?: string;
  rank?: TeacherRank;
  studentNumber?: string;
  admissionYear?: number;
}

export interface LoginResponse {
  accessToken: string;
  /** Epoch milliseconds */
  expiresAt: number;
  user: User;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
}

export type CourseState =
  | 'PROPOSED'
  | 'ASSIGNED'
  | 'GRADING_DEFINED'
  | 'PARTIALLY_REGISTERED'
  | 'FULLY_REGISTERED'
  | 'PARTIALLY_GRADED'
  | 'FULLY_GRADED';

/** In life-cycle order (the course detail page draws it as a timeline) */
export const COURSE_STATES: CourseState[] = [
  'PROPOSED',
  'ASSIGNED',
  'GRADING_DEFINED',
  'PARTIALLY_REGISTERED',
  'FULLY_REGISTERED',
  'PARTIALLY_GRADED',
  'FULLY_GRADED',
];

export interface Course {
  id: string;
  name: string;
  description: string;
  state: CourseState;
  prerequisites: { id: string; name: string }[];
  teaching: {
    year: number;
    semester: number;
    teacher: { id: string; firstName: string; lastName: string; rank: TeacherRank };
  } | null;
  /** Events the backend state machine allows in the current state */
  allowedEvents: string[];
}

export interface TeacherSummary {
  id: string;
  firstName: string;
  lastName: string;
  rank: TeacherRank;
}

// ---------- registrations and grading (Phase 3) ----------

export interface AvailableCourse {
  courseId: string;
  name: string;
  description: string;
  state: CourseState;
  year: number;
  semester: number;
  teacher: string;
  missingPrerequisites: { id: string; name: string }[];
  registered: boolean;
  finalized: boolean;
  alreadyPassed: boolean;
}

export interface MyRegistration {
  courseId: string;
  courseName: string;
  courseState: CourseState;
  year: number;
  semester: number;
  finalized: boolean;
  gradesPublished: boolean;
  theoryGrade?: number;
  labGrade?: number;
  finalGrade?: number;
  passed?: boolean;
}

export interface TeachingRegistration {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  admissionYear: number;
  finalized: boolean;
  theoryGrade?: number;
  labGrade?: number;
  finalGrade?: number;
  theoryRetained: boolean;
  labRetained: boolean;
}

export interface TeachingView {
  course: { id: string; name: string; state: CourseState };
  teaching: {
    year: number;
    semester: number;
    theoryWeight?: number;
    labWeight?: number;
    theoryRetentionYear?: number;
    labRetentionYear?: number;
    gradesFinalized: boolean;
  };
  registrations: TeachingRegistration[];
}

export interface GradingScheme {
  theoryWeight: number;
  labWeight: number;
  theoryRetentionYear?: number;
  labRetentionYear?: number;
}

export interface ImportReport {
  accepted: { row: number; studentNumber: string }[];
  rejected: { row: number; studentNumber: string; reason: string }[];
}

// ---------- universities and departments (Phase 5) ----------

export type OrgStatus = 'ACTIVE' | 'INACTIVE';

export interface UniversityInfo {
  id: string;
  name: string;
  logoUrl?: string;
  country?: string;
  city?: string;
  status: OrgStatus;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  status: OrgStatus;
  university: { id: string; name: string; logoUrl?: string };
}

export interface OrganizationOverview extends UniversityInfo {
  departments: (DepartmentInfo & { adminLogin: string | null })[];
}
