#!/bin/bash
# Database Migration Script for Student Results Management
# Phase 1: Apply database schema extensions

echo "Starting Phase 1: Database Schema Extensions Migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Apply the schema extensions
echo "Applying student results schema extensions..."
psql "$DATABASE_URL" -f server/sql/student-results-schema.sql

if [ $? -eq 0 ]; then
    echo "✓ Phase 1 migration completed successfully!"
    echo ""
    echo "Created tables:"
    echo "  - student_results"
    echo "  - affective_domain_scores" 
    echo "  - psychomotor_domain_scores"
    echo "  - class_statistics"
    echo "  - result_history"
    echo "  - teacher_subject_assignments"
    echo ""
    echo "Created functions:"
    echo "  - calculate_class_statistics()"
    echo "  - update_class_positions()"
    echo "  - trigger_result_statistics_update()"
    echo ""
    echo "Created indexes and triggers for automatic calculations"
else
    echo "✗ Migration failed. Please check the error above."
    exit 1
fi
