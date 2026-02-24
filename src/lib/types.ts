export type UserRole = "student" | "teacher" | "parent" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  school_id: string | null;
  parent_of?: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  logo_url?: string;
  invite_code: string;
  created_at: string;
}

export interface YearGroup {
  id: string;
  school_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Class {
  id: string;
  year_group_id: string;
  school_id: string;
  name: string;
  created_at: string;
  year_group?: YearGroup;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  school_id: string;
  created_at: string;
  class?: Class;
  subject?: Subject;
  teacher?: UserProfile;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  school_id: string;
  enrolled_at: string;
  student?: UserProfile;
  class?: Class;
}

export interface SchoolInviteCode {
  id: string;
  school_id: string;
  code: string;
  role: "student" | "teacher" | "parent";
  class_id?: string | null;
  max_uses?: number | null;
  uses_count: number;
  expires_at?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  created_by: string;
  school_id: string;
  class_name: string;
  class_subject_id?: string | null;
  status: "active" | "closed";
  created_at: string;
  teacher_name?: string;
  class_subject?: ClassSubject;
}

export interface StudentTaskStatus {
  id: string;
  assignment_id: string;
  student_id: string;
  is_read: boolean;
  is_done: boolean;
  read_at?: string | null;
  done_at?: string | null;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url?: string;
  grade?: number;
  feedback?: string;
  status: "submitted" | "graded" | "late";
  submitted_at: string;
  student_name?: string;
  assignment_title?: string;
}

export interface TimetableSlot {
  id: string;
  class_subject_id: string;
  school_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  created_at: string;
  class_subject?: ClassSubject;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  sender_role?: UserRole;
}

export interface ChatThread {
  user_id: string;
  user_name: string;
  user_role: UserRole;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  avatar_url?: string;
}
