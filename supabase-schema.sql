-- Academo Database Schema for Supabase
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Schools table
CREATE TABLE schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  avatar_url TEXT,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  parent_of UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHOOL STRUCTURE
-- ============================================================

-- Year groups (e.g., Year 10, Year 11)
CREATE TABLE year_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- Classes within year groups (e.g., 10A, 10W, 11B)
CREATE TABLE classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  year_group_id UUID REFERENCES year_groups(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_group_id, name)
);

-- Subjects offered by a school (e.g., Mathematics, English, Business)
CREATE TABLE subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10B981',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- Links a class to a subject with an assigned teacher
CREATE TABLE class_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- Student enrollment in a class (one home class per student)
CREATE TABLE student_enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

-- ============================================================
-- INVITE SYSTEM
-- ============================================================

-- Role-specific invite codes for a school
CREATE TABLE school_invite_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent')),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  max_uses INT,
  uses_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENTS & SUBMISSIONS
-- ============================================================

-- Assignments
CREATE TABLE assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  class_subject_id UUID REFERENCES class_subjects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track per-student read/done status on assignments
CREATE TABLE student_task_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_done BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);

-- Submissions
CREATE TABLE submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TIMETABLE
-- ============================================================

-- Timetable slots for class-subject combos
CREATE TABLE timetable_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_subject_id UUID REFERENCES class_subjects(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGING & EVENTS
-- ============================================================

-- Messages
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School calendar events
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  event_type TEXT NOT NULL CHECK (event_type IN ('exam', 'holiday', 'event', 'meeting')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE year_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_task_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Schools
CREATE POLICY "Authenticated users can create schools" ON schools
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "School members can view their school" ON schools
  FOR SELECT USING (id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can update their school" ON schools
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = schools.id));

-- Profiles
CREATE POLICY "Users can view profiles in their school" ON profiles
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can create profiles in their school" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = profiles.school_id)
    OR id = auth.uid()
  );

-- Year Groups
CREATE POLICY "School members can view year groups" ON year_groups
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage year groups" ON year_groups
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = year_groups.school_id));

-- Classes
CREATE POLICY "School members can view classes" ON classes
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage classes" ON classes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = classes.school_id));

-- Subjects
CREATE POLICY "School members can view subjects" ON subjects
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage subjects" ON subjects
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = subjects.school_id));

-- Class Subjects
CREATE POLICY "School members can view class subjects" ON class_subjects
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage class subjects" ON class_subjects
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = class_subjects.school_id));

-- Student Enrollments
CREATE POLICY "School members can view enrollments" ON student_enrollments
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage enrollments" ON student_enrollments
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = student_enrollments.school_id));

-- Invite Codes (publicly readable for signup validation)
CREATE POLICY "Anyone can look up invite codes by code" ON school_invite_codes
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage invite codes" ON school_invite_codes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = school_invite_codes.school_id));

-- Assignments
CREATE POLICY "School members can view assignments" ON assignments
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Teachers can create assignments" ON assignments
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')));

-- Student Task Status
CREATE POLICY "Students can manage their task status" ON student_task_status
  FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Teachers can view task status" ON student_task_status
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')));

-- Submissions
CREATE POLICY "Students can create submissions" ON submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Users can view relevant submissions" ON submissions
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = submissions.assignment_id
      AND (p.role IN ('teacher', 'admin') OR p.id = (SELECT parent_of FROM profiles WHERE id = auth.uid()))
    )
  );
CREATE POLICY "Teachers can grade submissions" ON submissions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')));

-- Timetable
CREATE POLICY "School members can view timetable" ON timetable_slots
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage timetable" ON timetable_slots
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = timetable_slots.school_id));

-- Messages
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can mark messages as read" ON messages
  FOR UPDATE USING (receiver_id = auth.uid());

-- Events
CREATE POLICY "School members can view events" ON events
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage events" ON events
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_school ON profiles(school_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_year_groups_school ON year_groups(school_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_classes_year_group ON classes(year_group_id);
CREATE INDEX idx_subjects_school ON subjects(school_id);
CREATE INDEX idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX idx_class_subjects_teacher ON class_subjects(teacher_id);
CREATE INDEX idx_class_subjects_school ON class_subjects(school_id);
CREATE INDEX idx_student_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_student_enrollments_class ON student_enrollments(class_id);
CREATE INDEX idx_student_enrollments_school ON student_enrollments(school_id);
CREATE INDEX idx_invite_codes_school ON school_invite_codes(school_id);
CREATE INDEX idx_invite_codes_code ON school_invite_codes(code);
CREATE INDEX idx_assignments_school ON assignments(school_id);
CREATE INDEX idx_assignments_created_by ON assignments(created_by);
CREATE INDEX idx_assignments_class_subject ON assignments(class_subject_id);
CREATE INDEX idx_task_status_assignment ON student_task_status(assignment_id);
CREATE INDEX idx_task_status_student ON student_task_status(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_timetable_class_subject ON timetable_slots(class_subject_id);
CREATE INDEX idx_timetable_school ON timetable_slots(school_id);
CREATE INDEX idx_timetable_day ON timetable_slots(day_of_week);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_events_school ON events(school_id);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view announcements" ON announcements
  FOR SELECT USING (school_id = public.get_my_school_id());

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.school_id = announcements.school_id
    )
  );

-- ============================================================
-- CONTACT REQUESTS (landing page form)
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  email TEXT NOT NULL,
  student_count TEXT,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact requests" ON contact_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view contact requests" ON contact_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_school_id UUID;
  v_class_id UUID;
  v_school_name TEXT;
  v_invite_code TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;
  v_class_id := (NEW.raw_user_meta_data->>'class_id')::UUID;
  v_school_name := NEW.raw_user_meta_data->>'school_name';
  v_invite_code := NEW.raw_user_meta_data->>'invite_code';

  -- For admins: create the school first
  IF v_role = 'admin' AND v_school_name IS NOT NULL AND v_school_name != '' THEN
    INSERT INTO public.schools (name)
    VALUES (v_school_name)
    RETURNING id INTO v_school_id;
  END IF;

  -- Create the profile
  INSERT INTO public.profiles (id, email, full_name, role, school_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_school_id
  );

  -- For students with a class_id: auto-enroll in class
  IF v_role = 'student' AND v_class_id IS NOT NULL AND v_school_id IS NOT NULL THEN
    INSERT INTO public.student_enrollments (student_id, class_id, school_id)
    VALUES (NEW.id, v_class_id, v_school_id)
    ON CONFLICT (student_id) DO NOTHING;
  END IF;

  -- Increment invite code uses_count
  IF v_invite_code IS NOT NULL AND v_invite_code != '' THEN
    UPDATE public.school_invite_codes
    SET uses_count = uses_count + 1
    WHERE code = v_invite_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
