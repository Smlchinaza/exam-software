export const SubjectResult = {
  subject: '',
  assessment1: 0,       // max 15
  assessment2: 0,       // max 15
  caTest: 0,            // max 10
  examScore: 0,         // max 60
  total: 0,             // max 100
  grade: '',
  positionInClass: 0,
  highestInClass: 0,
  remark: ''
};

export const WaecGrade = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];

export const StudentInfo = {
  fullName: '',
  admissionNumber: '',
  className: '',
  gender: '',
  dateOfBirth: '',
  numberOfStudentsInClass: 0,
  term: 'First Term',
  session: '',
  passportPhotoUrl: ''
};

export const SchoolInfo = {
  name: '',
  address: '',
  phone: '',
  email: '',
  motto: '',
  logoUrl: '',
  ministry: ''
};

export const AffectiveTrait = {
  label: '',
  score: 0,
  maxScore: 0
};

export const RemarksData = {
  formTeacherName: '',
  formTeacherRemark: '',
  principalName: '',
  principalRemark: '',
  nextTermBegins: ''
};

export const ResultSheetData = {
  school: SchoolInfo,
  student: StudentInfo,
  subjects: [],
  affectiveDomain: [],
  psychomotorDomain: [],
  remarks: RemarksData,
  daysPresent: 0,
  daysSchoolOpened: 0
};
