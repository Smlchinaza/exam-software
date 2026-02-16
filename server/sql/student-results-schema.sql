-- Student Result Management Schema Extensions
-- Phase 1: Database Schema Extensions for PostgreSQL
-- Add to existing schema-postgres.sql

-- Grade enumeration for consistent grading
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'grade_enum'
) THEN CREATE TYPE grade_enum AS ENUM ('A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9');
END IF;
END $$;

-- Performance rating enumeration
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'performance_rating'
) THEN CREATE TYPE performance_rating AS ENUM ('Excellent', 'Very Good', 'Good', 'Fair', 'Poor');
END IF;
END $$;

-- Term enumeration
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'term_enum'
) THEN CREATE TYPE term_enum AS ENUM ('1st Term', '2nd Term', '3rd Term');
END IF;
END $$;

-- Class enumeration
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'class_enum'
) THEN CREATE TYPE class_enum AS ENUM ('JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3');
END IF;
END $$;

-- Student Results Table
CREATE TABLE IF NOT EXISTS student_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name text NOT NULL, -- Denormalized for performance
    teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Class and session information
    class class_enum NOT NULL,
    session text NOT NULL,
    term term_enum NOT NULL,
    
    -- Assessment Scores (matching result sheet structure)
    assessment1 numeric CHECK (assessment1 >= 0 AND assessment1 <= 15) DEFAULT 0,
    assessment2 numeric CHECK (assessment2 >= 0 AND assessment2 <= 15) DEFAULT 0,
    ca_test numeric CHECK (ca_test >= 0 AND ca_test <= 10) DEFAULT 0,
    exam_score numeric CHECK (exam_score >= 0 AND exam_score <= 60) DEFAULT 0,
    
    -- Calculated fields
    total_score numeric GENERATED ALWAYS AS (assessment1 + assessment2 + ca_test + exam_score) STORED,
    grade grade_enum GENERATED ALWAYS AS (
        CASE 
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 75 THEN 'A1'::grade_enum
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 70 THEN 'B2'::grade_enum
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 65 THEN 'B3'::grade_enum
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 60 THEN 'C4'::grade_enum
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 55 THEN 'C5'::grade_enum
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 50 THEN 'C6'::grade_enum
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 45 THEN 'D7'::grade_enum
            WHEN (assessment1 + assessment2 + ca_test + exam_score) >= 40 THEN 'E8'::grade_enum
            ELSE 'F9'::grade_enum
        END
    ) STORED,
    
    -- Class position and statistics
    position_in_class integer,
    highest_in_class numeric,
    class_average numeric,
    
    -- Remarks and feedback
    remark text,
    teacher_comment text,
    
    -- Attendance statistics
    days_present integer DEFAULT 0,
    days_school_opened integer DEFAULT 0,
    
    -- Metadata
    is_locked boolean DEFAULT false,
    last_updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Ensure unique result per student per subject per term
    UNIQUE(school_id, student_id, subject_name, class, session, term)
);

-- Indexes for student_results
CREATE INDEX IF NOT EXISTS idx_student_results_school ON student_results(school_id);
CREATE INDEX IF NOT EXISTS idx_student_results_student ON student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_student_results_teacher ON student_results(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_results_subject_class ON student_results(subject_name, class, session, term);
CREATE INDEX IF NOT EXISTS idx_student_results_composite ON student_results(school_id, subject_name, class, session, term);

-- Affective Domain Table
CREATE TABLE IF NOT EXISTS affective_domain_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_result_id uuid NOT NULL REFERENCES student_results(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    punctuality performance_rating DEFAULT 'Good',
    attendance performance_rating DEFAULT 'Good',
    neatness performance_rating DEFAULT 'Good',
    honesty performance_rating DEFAULT 'Good',
    cooperation performance_rating DEFAULT 'Good',
    leadership performance_rating DEFAULT 'Good',
    responsibility performance_rating DEFAULT 'Good',
    creativity performance_rating DEFAULT 'Good',
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE(student_result_id)
);

-- Psychomotor Domain Table
CREATE TABLE IF NOT EXISTS psychomotor_domain_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_result_id uuid NOT NULL REFERENCES student_results(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    sports performance_rating DEFAULT 'Good',
    handicraft performance_rating DEFAULT 'Good',
    drawing performance_rating DEFAULT 'Good',
    music performance_rating DEFAULT 'Good',
    drama performance_rating DEFAULT 'Good',
    technical_skills performance_rating DEFAULT 'Good',
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE(student_result_id)
);

-- Class Statistics Table
CREATE TABLE IF NOT EXISTS class_statistics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    subject_name text NOT NULL,
    class class_enum NOT NULL,
    session text NOT NULL,
    term term_enum NOT NULL,
    
    -- Performance metrics
    total_students integer DEFAULT 0,
    highest_score numeric DEFAULT 0,
    lowest_score numeric DEFAULT 0,
    average_score numeric DEFAULT 0,
    
    -- Grade distribution
    a1_count integer DEFAULT 0,
    b2_count integer DEFAULT 0,
    b3_count integer DEFAULT 0,
    c4_count integer DEFAULT 0,
    c5_count integer DEFAULT 0,
    c6_count integer DEFAULT 0,
    d7_count integer DEFAULT 0,
    e8_count integer DEFAULT 0,
    f9_count integer DEFAULT 0,
    
    calculated_at timestamptz NOT NULL DEFAULT now(),
    calculated_by uuid REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(school_id, subject_name, class, session, term)
);

-- Indexes for class_statistics
CREATE INDEX IF NOT EXISTS idx_class_stats_composite ON class_statistics(school_id, subject_name, class, session, term);

-- Result History/Audit Trail Table
CREATE TABLE IF NOT EXISTS result_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_result_id uuid NOT NULL REFERENCES student_results(id) ON DELETE CASCADE,
    
    -- Previous values for audit
    previous_assessment1 numeric,
    previous_assessment2 numeric,
    previous_ca_test numeric,
    previous_exam_score numeric,
    previous_total_score numeric,
    previous_grade grade_enum,
    
    -- New values
    new_assessment1 numeric,
    new_assessment2 numeric,
    new_ca_test numeric,
    new_exam_score numeric,
    new_total_score numeric,
    new_grade grade_enum,
    
    -- Change metadata
    changed_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    change_reason text,
    ip_address inet,
    user_agent text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for result_history
CREATE INDEX IF NOT EXISTS idx_result_history_student_result ON result_history(student_result_id);
CREATE INDEX IF NOT EXISTS idx_result_history_changed_by ON result_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_result_history_created_at ON result_history(created_at);

-- Teacher-Subject Assignment Table (if not exists)
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name text NOT NULL,
    class class_enum NOT NULL,
    session text NOT NULL,
    term term_enum NOT NULL,
    
    is_active boolean DEFAULT true,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(school_id, teacher_id, subject_name, class, session, term)
);

-- Indexes for teacher_subject_assignments
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject ON teacher_subject_assignments(subject_name, class);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_student_results_updated_at BEFORE UPDATE ON student_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affective_domain_updated_at BEFORE UPDATE ON affective_domain_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_psychomotor_domain_updated_at BEFORE UPDATE ON psychomotor_domain_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate class statistics
CREATE OR REPLACE FUNCTION calculate_class_statistics(
    p_school_id uuid,
    p_subject_name text,
    p_class class_enum,
    p_session text,
    p_term term_enum
)
RETURNS void AS $$
DECLARE
    v_total_students integer;
    v_highest_score numeric;
    v_lowest_score numeric;
    v_average_score numeric;
    v_a1_count integer;
    v_b2_count integer;
    v_b3_count integer;
    v_c4_count integer;
    v_c5_count integer;
    v_c6_count integer;
    v_d7_count integer;
    v_e8_count integer;
    v_f9_count integer;
BEGIN
    -- Calculate statistics
    SELECT 
        COUNT(*),
        COALESCE(MAX(total_score), 0),
        COALESCE(MIN(total_score), 0),
        COALESCE(AVG(total_score), 0),
        COUNT(CASE WHEN grade = 'A1' THEN 1 END),
        COUNT(CASE WHEN grade = 'B2' THEN 1 END),
        COUNT(CASE WHEN grade = 'B3' THEN 1 END),
        COUNT(CASE WHEN grade = 'C4' THEN 1 END),
        COUNT(CASE WHEN grade = 'C5' THEN 1 END),
        COUNT(CASE WHEN grade = 'C6' THEN 1 END),
        COUNT(CASE WHEN grade = 'D7' THEN 1 END),
        COUNT(CASE WHEN grade = 'E8' THEN 1 END),
        COUNT(CASE WHEN grade = 'F9' THEN 1 END)
    INTO 
        v_total_students, v_highest_score, v_lowest_score, v_average_score,
        v_a1_count, v_b2_count, v_b3_count, v_c4_count, v_c5_count, v_c6_count,
        v_d7_count, v_e8_count, v_f9_count
    FROM student_results
    WHERE school_id = p_school_id
        AND subject_name = p_subject_name
        AND class = p_class
        AND session = p_session
        AND term = p_term;
    
    -- Upsert class statistics
    INSERT INTO class_statistics (
        school_id, subject_name, class, session, term,
        total_students, highest_score, lowest_score, average_score,
        a1_count, b2_count, b3_count, c4_count, c5_count, c6_count,
        d7_count, e8_count, f9_count, calculated_at
    ) VALUES (
        p_school_id, p_subject_name, p_class, p_session, p_term,
        v_total_students, v_highest_score, v_lowest_score, v_average_score,
        v_a1_count, v_b2_count, v_b3_count, v_c4_count, v_c5_count, v_c6_count,
        v_d7_count, v_e8_count, v_f9_count, now()
    )
    ON CONFLICT (school_id, subject_name, class, session, term)
    DO UPDATE SET
        total_students = EXCLUDED.total_students,
        highest_score = EXCLUDED.highest_score,
        lowest_score = EXCLUDED.lowest_score,
        average_score = EXCLUDED.average_score,
        a1_count = EXCLUDED.a1_count,
        b2_count = EXCLUDED.b2_count,
        b3_count = EXCLUDED.b3_count,
        c4_count = EXCLUDED.c4_count,
        c5_count = EXCLUDED.c5_count,
        c6_count = EXCLUDED.c6_count,
        d7_count = EXCLUDED.d7_count,
        e8_count = EXCLUDED.e8_count,
        f9_count = EXCLUDED.f9_count,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to update student positions in class
CREATE OR REPLACE FUNCTION update_class_positions(
    p_school_id uuid,
    p_subject_name text,
    p_class class_enum,
    p_session text,
    p_term term_enum
)
RETURNS void AS $$
DECLARE
    student_record RECORD;
    position_counter integer := 1;
BEGIN
    -- Update positions based on total score (descending)
    FOR student_record IN
        SELECT 
            id,
            total_score,
            (SELECT MAX(total_score) FROM student_results 
             WHERE school_id = p_school_id 
                AND subject_name = p_subject_name 
                AND class = p_class 
                AND session = p_session 
                AND term = p_term) as highest_score,
            (SELECT AVG(total_score) FROM student_results 
             WHERE school_id = p_school_id 
                AND subject_name = p_subject_name 
                AND class = p_class 
                AND session = p_session 
                AND term = p_term) as class_average
        FROM student_results
        WHERE school_id = p_school_id
            AND subject_name = p_subject_name
            AND class = p_class
            AND session = p_session
            AND term = p_term
        ORDER BY total_score DESC, id ASC
    LOOP
        UPDATE student_results 
        SET 
            position_in_class = position_counter,
            highest_in_class = student_record.highest_score,
            class_average = student_record.class_average
        WHERE id = student_record.id;
        
        position_counter := position_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update statistics and positions when results change
CREATE OR REPLACE FUNCTION trigger_result_statistics_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update class statistics
    PERFORM calculate_class_statistics(
        NEW.school_id, 
        NEW.subject_name, 
        NEW.class, 
        NEW.session, 
        NEW.term
    );
    
    -- Update class positions
    PERFORM update_class_positions(
        NEW.school_id, 
        NEW.subject_name, 
        NEW.class, 
        NEW.session, 
        NEW.term
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for INSERT and UPDATE
CREATE TRIGGER trigger_student_result_stats
    AFTER INSERT OR UPDATE ON student_results
    FOR EACH ROW EXECUTE FUNCTION trigger_result_statistics_update();
