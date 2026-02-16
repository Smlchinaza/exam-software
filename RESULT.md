You are a senior frontend engineer. I need you to build a production-ready Nigerian Secondary School Termly Result Sheet as a Next.js React component.

---

### TECH STACK
- Next.js (App Router or Pages Router — match the existing codebase)
- TypeScript
- Tailwind CSS (utility classes only, no custom config additions)
- Google Fonts via next/font (EB Garamond + Barlow Condensed)

---

### COMPONENT ARCHITECTURE

Create the following file structure:

components/
  result-sheet/
    ResultSheet.tsx          ← Main orchestrator component
    ResultHeader.tsx         ← School logo, name, address, motto
    StudentBio.tsx           ← Student info grid + passport photo slot
    ResultTable.tsx          ← The full academic performance table
    StatsPanel.tsx           ← Aggregate, average, position, performance
    GradeKey.tsx             ← WAEC A1–F9 grade legend
    AffectiveDomain.tsx      ← Character + psychomotor assessment tables
    RemarksSection.tsx       ← Form teacher / principal / parent remarks
    ResultFooter.tsx         ← School stamp notice + print info

types/
  result.types.ts            ← All TypeScript interfaces and types

---

### TYPESCRIPT INTERFACES
Define these in result.types.ts:

interface SubjectResult {
  subject: string;
  assessment1: number;       // max 15
  assessment2: number;       // max 15
  caTest: number;            // max 10
  examScore: number;         // max 60
  total: number;             // max 100
  grade: WaecGrade;
  positionInClass: number;
  highestInClass: number;
  remark: string;
}

type WaecGrade = 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';

interface StudentInfo {
  fullName: string;
  admissionNumber: string;
  className: string;
  gender: string;
  dateOfBirth: string;
  numberOfStudentsInClass: number;
  term: 'First Term' | 'Second Term' | 'Third Term';
  session: string;
  passportPhotoUrl?: string;
}

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  motto: string;
  logoUrl?: string;
  ministry?: string;
}

interface AffectiveTrait {
  label: string;
  score: number;
  maxScore: number;
}

interface RemarksData {
  formTeacherName: string;
  formTeacherRemark: string;
  principalName: string;
  principalRemark: string;
  nextTermBegins: string;
}

interface ResultSheetData {
  school: SchoolInfo;
  student: StudentInfo;
  subjects: SubjectResult[];
  affectiveDomain: AffectiveTrait[];
  psychomotorDomain: AffectiveTrait[];
  remarks: RemarksData;
  daysPresent: number;
  daysSchoolOpened: number;
}

---

### DESIGN SYSTEM

Implement these as Tailwind classes or inline CSS variables:

Colors:
  --green:       #006600   (primary — headers, borders, accents)
  --green-mid:   #1a7a1a
  --green-light: #e8f5e8   (alternating row tint)
  --gold:        #c8960c   (title ribbon, grade badges, accents)
  --gold-light:  #f5e9c3
  --ink:         #1a1a1a
  --off-white:   #fafaf7   (page background)
  --border:      #c8c0a8

Typography:
  Display/headers → EB Garamond (serif, institutional authority)
  Labels/badges   → Barlow Condensed (compressed, legible at small sizes)
  Body/data       → Barlow (clean, readable)

---

### RESULT TABLE REQUIREMENTS

The table MUST have:
1. Two-level grouped column headers:
   - Group 1: "Continuous Assessment (40 Marks)" spanning Assess.1 / Assess.2 / C.A Test
   - Group 2: "Examination" spanning Exam Score
   - Group 3: "Result" spanning Total / Grade
   - Group 4: "Analysis" spanning Position / Highest / Remark

2. A "Maximum Score" sub-row showing: 15 / 15 / 10 / 60 / 100

3. Row styling:
   - Odd rows: white bg
   - Even rows: #faf7f0 bg
   - Hover: green-light bg (#e8f5e8)
   - Failing rows (total < 40): light red tint #fff5f5

4. Grade badges: colour-coded pill spans
   A1 → bg #004400 (darkest green)
   B2–B3 → greens
   C4–C6 → mid greens
   D7 → gold/amber
   E8 → orange
   F9 → red #b30000

5. Score colouring:
   ≥ 70 → green  (#006600, font-weight 600)
   50–69 → amber (#b07800, font-weight 600)
   < 50  → red   (#b30000, font-weight 600)

6. tfoot summary row: full-width green background, white text, showing column totals

---

### UTILITY FUNCTIONS
Create utils/resultUtils.ts with:

  computeTotal(a1, a2, caTest, examScore): number
  deriveGrade(total: number): WaecGrade
  gradeToRemark(grade: WaecGrade): string
  colorizeScore(score: number, max: number): string   // returns Tailwind class
  ordinalSuffix(n: number): string                    // 1 → "1st", 2 → "2nd" etc.
  computeAggregate(subjects: SubjectResult[]): { totalScore, average, subjectsPassed }

---

### PRINT SUPPORT
- Add a ResultSheet.module.css (or Tailwind print: variants) for @media print
- Hide browser chrome, set page margins to 1cm, force white background
- Add a <PrintButton /> component that calls window.print()
- Watermark (school crest, 5% opacity) should be visible in print

---

### SAMPLE DATA
Create lib/sampleResultData.ts exporting a complete ResultSheetData object
with 10 subjects, realistic Nigerian school scores, and all fields populated.
This is used to render a preview at /result-preview (create this page).

---

### ACCESSIBILITY
- All table headers use scope="col" and scope="row"
- Grade badges have aria-label="Grade: A1 — Excellent"
- Failing subjects get role="alert" on their row for screen readers
- Color is never the sole indicator of meaning (add text labels)

---

### CONSTRAINTS
- NO external UI libraries (no shadcn, no MUI, no Chakra)
- NO inline styles except where Tailwind cannot express the value
- Each sub-component receives only the props it needs (no prop drilling the full object)
- Components must be server components by default; only add "use client" where interactivity requires it (e.g. PrintButton)
- The result sheet must be responsive: readable on mobile, perfect on A4 at 960px max-width