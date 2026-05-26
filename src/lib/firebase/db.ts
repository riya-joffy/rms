import { User, MarketReport, ActivityLog, Notification, DashboardStats, Organization } from '../../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc,
  deleteDoc,
  onSnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { isAdminRole, resolveUserRole } from '../roles';
import { createAuthUser } from './createAuthUser';

// Helper to determine if real Firebase is configured
export const isFirebaseActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return !!apiKey && apiKey !== 'YOUR_API_KEY_HERE';
};

// ==========================================
// 1. Initial Mock / Seed Data
// ==========================================

const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-stjude',
    name: 'St. Jude Children Research Hospital',
    type: 'Hospital',
    location: 'Memphis, TN',
    numberOfBeds: 80,
    numberOfEmployees: 1200,
    headOfHospital: 'Dr. James Downing',
    contactNumber: '+1 901-595-3300',
    headOfHr: 'Sarah Jenkins',
    hrContact: '+1 901-595-4422',
    hrEmail: 's.jenkins@stjude.org'
  },
  {
    id: 'org-stanford',
    name: 'Stanford School of Medicine',
    type: 'Institution',
    location: 'Stanford, CA',
    finalYearStudentsCount: 150,
    headOfInstitution: 'Dean Lloyd Minor',
    headContact: '+1 650-723-6951',
    spocName: 'Grace Hopper',
    spocContact: '+1 650-723-1122',
    spocEmail: 'ghopper@stanford.edu'
  },
  {
    id: 'org-citygen',
    name: 'City General Hospital',
    type: 'Hospital',
    location: 'Boston, MA',
    numberOfBeds: 120,
    numberOfEmployees: 800,
    headOfHospital: 'Dr. Sarah Connor',
    contactNumber: '+1 555-0199',
    headOfHr: 'John Smith',
    hrContact: '+1 555-0188',
    hrEmail: 'jsmith@cityhospital.org'
  },
  {
    id: 'org-statemed',
    name: 'State Medical University',
    type: 'Institution',
    location: 'New York, NY',
    finalYearStudentsCount: 250,
    headOfInstitution: 'Dean Arthur Pendelton',
    headContact: '+1 555-0211',
    spocName: 'Elena Rostova',
    spocContact: '+1 555-0212',
    spocEmail: 'erostova@statemed.edu'
  },
  {
    id: 'org-grace',
    name: 'Grace Clinic Centre',
    type: 'Hospital', // Kept as Hospital for backward-compatibility or type matching if needed
    location: 'Chicago, IL',
    numberOfBeds: 45,
    numberOfEmployees: 150,
    headOfHospital: 'Dr. Gregory House',
    contactNumber: '+1 555-0300',
    headOfHr: 'James Wilson',
    hrContact: '+1 555-0301',
    hrEmail: 'jwilson@graceclinic.org'
  }
];

const DEFAULT_USERS: User[] = [
  {
    id: 'A-101',
    name: 'Riya Joffy',
    email: 'riyajoffy1@gmail.com',
    role: 'admin',
    department: 'Operations',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'active',
    lastActive: '2026-05-21T15:27:00Z',
  },
  {
    id: 'S-201',
    name: 'Zandra Kanja',
    email: 'zandrakanja@gmail.com',
    role: 'staff',
    department: 'Market Analysis',
    region: 'North America',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'active',
    lastActive: '2026-05-21T15:30:00Z',
  },
  {
    id: 'S-202',
    name: 'Marcus Chen',
    email: 'marcus.chen@gmail.com',
    role: 'staff',
    department: 'Field Surveys',
    region: 'Europe',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'active',
    lastActive: '2026-05-25T11:20:00Z',
  },
  {
    id: 'S-203',
    name: 'Eleanor Vance',
    email: 'eleanor.vance@gmail.com',
    role: 'staff',
    department: 'Clinical Outreach',
    region: 'Asia Pacific',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    status: 'active',
    lastActive: '2026-05-24T09:45:00Z',
  },
  {
    id: 'S-204',
    name: 'Geo Joffy',
    email: 'geojoffy@gmail.com',
    role: 'staff',
    department: 'Relationship Management',
    region: 'Kerala',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    status: 'active',
    lastActive: '2026-05-26T09:00:00Z',
  }
];

const DEFAULT_REPORTS: MarketReport[] = [
  {
    id: 'REP-2026-001',
    date: '2026-05-20',
    time: '14:30',
    dateOfActivity: '2026-05-19',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Approved',
    activityType: 'Hospital Visit',
    meetingType: 'Physical',
    institutionName: 'City General Hospital',
    location: 'Boston, MA',
    finalYearStudentsCount: 120,
    headOfInstitution: 'Dr. Sarah Connor',
    contactNumber: '+1 555-0199',
    spocName: 'John Smith',
    spocContact: '+1 555-0188',
    spocEmail: 'jsmith@cityhospital.org',
    notes: 'Conducted a physical walkthrough and presentation. Spoke to final year medical students. High level of interest in operational programs. Recommended immediate follow-up contract dispatch.',
    costOfVisit: 485,
    dateTime: '2026-05-20T10:00',
    feedback: 'Excellent work Zandra. Program dispatched and pilot schedule approved.',
    attachments: [
      { id: 'att-1', name: 'hospital_presentation.pdf', size: '2.4 MB', type: 'application/pdf', url: '#' }
    ],
    history: [
      { id: 'h-11', status: 'Pending', date: '2026-05-20T14:45:00Z', comment: 'Submitted visit report.', user: 'Zandra Kanja' },
      { id: 'h-12', status: 'Approved', date: '2026-05-20T17:30:00Z', comment: 'Approved, program dispatched.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-002',
    date: '2026-05-21',
    time: '09:15',
    dateOfActivity: '2026-05-20',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Pending',
    activityType: 'Institution Visit',
    meetingType: 'Virtual',
    institutionName: 'State Medical University',
    location: 'New York, NY',
    finalYearStudentsCount: 250,
    headOfInstitution: 'Dean Arthur Pendelton',
    contactNumber: '+1 555-0211',
    spocName: 'Elena Rostova',
    spocContact: '+1 555-0212',
    spocEmail: 'erostova@statemed.edu',
    notes: 'Virtual seminar conducted on RMS procedures. Over 200 medical students attended and filled the feedback. Requesting onboarding details for final year candidates.',
    costOfVisit: 120,
    dateTime: '2026-05-21T08:00',
    attachments: [],
    history: [
      { id: 'h-21', status: 'Pending', date: '2026-05-21T09:30:00Z', comment: 'Submitted for university review.', user: 'Zandra Kanja' }
    ]
  },
  {
    id: 'REP-2026-003',
    date: '2026-05-21',
    time: '11:00',
    dateOfActivity: '2026-05-21',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Draft',
    activityType: 'SPOC Meeting',
    meetingType: 'Telephonic',
    institutionName: 'Grace Clinic Centre',
    location: 'Chicago, IL',
    finalYearStudentsCount: 45,
    headOfInstitution: 'Dr. Gregory House',
    contactNumber: '+1 555-0300',
    spocName: 'James Wilson',
    spocContact: '+1 555-0301',
    spocEmail: 'jwilson@graceclinic.org',
    notes: 'Brief telephone sync on student rotation slots. Draft saved. Plan to finalize physical visit details and numbers tomorrow.',
    costOfVisit: 45,
    dateTime: '2026-05-22T14:00',
    attachments: [],
    history: [
      { id: 'h-31', status: 'Draft', date: '2026-05-21T11:00:00Z', comment: 'Draft saved locally.', user: 'Zandra Kanja' }
    ]
  },
  {
    id: 'REP-2026-004',
    date: '2026-05-25',
    time: '10:15',
    dateOfActivity: '2026-05-24',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Approved',
    activityType: 'Meeting with Organisation',
    meetingType: 'Hospital',
    hospitalName: 'St. Jude Children Research Hospital',
    location: 'Memphis, TN',
    numberOfBeds: 80,
    numberOfEmployees: 1200,
    headOfHospital: 'Dr. James Downing',
    contactNumber: '+1 901-595-3300',
    headOfHr: 'Sarah Jenkins',
    hrContact: '+1 901-595-4422',
    hrEmail: 's.jenkins@stjude.org',
    notes: 'Conducted a premium CRM profiling session with the pediatric department. Highly receptive to our residency partnership initiative. St. Jude profile has been successfully saved in our CRM stakeholder registry.',
    marketingObservation: 'Conducted a premium CRM profiling session with the pediatric department. Highly receptive to our residency partnership initiative. St. Jude profile has been successfully saved in our CRM stakeholder registry.',
    costOfVisit: 350,
    dateTime: '2026-05-25T10:15',
    attachments: [],
    history: [
      { id: 'h-41', status: 'Pending', date: '2026-05-25T10:30:00Z', comment: 'Compiled hospital meeting.', user: 'Zandra Kanja' },
      { id: 'h-42', status: 'Approved', date: '2026-05-25T12:00:00Z', comment: 'Profile updated and residency program approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-005',
    date: '2026-05-26',
    time: '11:00',
    dateOfActivity: '2026-05-25',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Pending',
    activityType: 'Meeting with Organisation',
    meetingType: 'Institution',
    institutionName: 'Stanford School of Medicine',
    location: 'Stanford, CA',
    finalYearStudentsCount: 150,
    headOfInstitution: 'Dean Lloyd Minor',
    headContact: '+1 650-723-6951',
    spocName: 'Grace Hopper',
    spocContact: '+1 650-723-1122',
    spocEmail: 'ghopper@stanford.edu',
    notes: 'Met with the dean and student placement coordinators. Negotiated rotation schedules for the upcoming graduating class of 150 candidates. The profile details are completely loaded.',
    marketingObservation: 'Met with the dean and student placement coordinators. Negotiated rotation schedules for the upcoming graduating class of 150 candidates. The profile details are completely loaded.',
    costOfVisit: 180,
    dateTime: '2026-05-26T11:00',
    attachments: [],
    history: [
      { id: 'h-51', status: 'Pending', date: '2026-05-26T11:15:00Z', comment: 'Submitted rotation schedule for medical students.', user: 'Zandra Kanja' }
    ]
  },
  {
    id: 'REP-2026-006',
    date: '2026-03-05',
    time: '10:00',
    dateOfActivity: '2026-03-04',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Approved',
    activityType: 'Hospital Visit',
    meetingType: 'Physical',
    institutionName: 'City General Hospital',
    location: 'Boston, MA',
    notes: 'Quarterly review with pediatric resident leads. High student placement engagement for clinical rotations.',
    costOfVisit: 320,
    dateTime: '2026-03-05T10:00',
    attachments: [],
    history: [
      { id: 'h-61', status: 'Pending', date: '2026-03-05T10:30:00Z', comment: 'Submitted quarterly report.', user: 'Zandra Kanja' },
      { id: 'h-62', status: 'Approved', date: '2026-03-05T12:00:00Z', comment: 'Approved by board.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-007',
    date: '2026-03-12',
    time: '13:15',
    dateOfActivity: '2026-03-11',
    staffName: 'Marcus Chen',
    staffId: 'S-202',
    department: 'Field Surveys',
    status: 'Approved',
    activityType: 'SPOC Meeting',
    meetingType: 'Telephonic',
    institutionName: 'Stanford School of Medicine',
    location: 'Stanford, CA',
    notes: 'Detailed discussion on candidate orientation schedules. Cleared accommodation expenses.',
    costOfVisit: 650,
    dateTime: '2026-03-12T13:15',
    attachments: [],
    history: [
      { id: 'h-71', status: 'Pending', date: '2026-03-12T13:30:00Z', comment: 'Submitted orientation expenses.', user: 'Marcus Chen' },
      { id: 'h-72', status: 'Approved', date: '2026-03-12T15:00:00Z', comment: 'Approved expenses.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-008',
    date: '2026-03-22',
    time: '09:00',
    dateOfActivity: '2026-03-20',
    staffName: 'Eleanor Vance',
    staffId: 'S-203',
    department: 'Clinical Outreach',
    status: 'Approved',
    activityType: 'Participation in Conferences',
    meetingType: 'Physical',
    institutionName: 'State Medical University',
    location: 'New York, NY',
    notes: 'Represented RMS at the National Medical Seminar. Spoke to 400 attendees. Booth rentals, travel and accommodation claimed.',
    costOfVisit: 1100,
    dateTime: '2026-03-22T09:00',
    attachments: [],
    history: [
      { id: 'h-81', status: 'Pending', date: '2026-03-22T09:30:00Z', comment: 'Submitted seminar expenses.', user: 'Eleanor Vance' },
      { id: 'h-82', status: 'Approved', date: '2026-03-22T17:00:00Z', comment: 'Approved seminar expenses.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-009',
    date: '2026-04-02',
    time: '15:30',
    dateOfActivity: '2026-04-01',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Approved',
    activityType: 'Follow ups',
    meetingType: 'Virtual',
    institutionName: 'Grace Clinic Centre',
    location: 'Chicago, IL',
    notes: 'Followed up on hospital residency contracts. Virtual sync expenses recorded.',
    costOfVisit: 150,
    dateTime: '2026-04-02T15:30',
    attachments: [],
    history: [
      { id: 'h-91', status: 'Pending', date: '2026-04-02T16:00:00Z', comment: 'Submitted.', user: 'Zandra Kanja' },
      { id: 'h-92', status: 'Approved', date: '2026-04-02T17:00:00Z', comment: 'Approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-010',
    date: '2026-04-15',
    time: '11:00',
    dateOfActivity: '2026-04-14',
    staffName: 'Marcus Chen',
    staffId: 'S-202',
    department: 'Field Surveys',
    status: 'Approved',
    activityType: 'Campaigns Conducted',
    meetingType: 'Physical',
    institutionName: 'City General Hospital',
    location: 'Boston, MA',
    notes: 'Conducted a candidate registration drive for final year graduates. Custom branding materials and lunch packages claimed.',
    costOfVisit: 420,
    dateTime: '2026-04-15T11:00',
    attachments: [],
    history: [
      { id: 'h-101', status: 'Pending', date: '2026-04-15T11:30:00Z', comment: 'Submitted.', user: 'Marcus Chen' },
      { id: 'h-102', status: 'Approved', date: '2026-04-15T13:00:00Z', comment: 'Approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-011',
    date: '2026-04-25',
    time: '14:00',
    dateOfActivity: '2026-04-23',
    staffName: 'Eleanor Vance',
    staffId: 'S-203',
    department: 'Clinical Outreach',
    status: 'Approved',
    activityType: 'Meeting with Organisation',
    meetingType: 'Physical',
    institutionName: 'St. Jude Children Research Hospital',
    location: 'Memphis, TN',
    notes: 'Clinical collaboration discussion with residency program manager. Flight expenses and hospital lunch claimed.',
    costOfVisit: 820,
    dateTime: '2026-04-25T14:00',
    attachments: [],
    history: [
      { id: 'h-111', status: 'Pending', date: '2026-04-25T14:30:00Z', comment: 'Submitted.', user: 'Eleanor Vance' },
      { id: 'h-112', status: 'Approved', date: '2026-04-25T16:00:00Z', comment: 'Approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-012',
    date: '2026-05-01',
    time: '09:00',
    dateOfActivity: '2026-04-30',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Approved',
    activityType: 'Institution Visit',
    meetingType: 'Physical',
    institutionName: 'Stanford School of Medicine',
    location: 'Stanford, CA',
    notes: 'Physical seminar on placements. Hotel accommodation and catering expenses claimed.',
    costOfVisit: 230,
    dateTime: '2026-05-01T09:00',
    attachments: [],
    history: [
      { id: 'h-121', status: 'Pending', date: '2026-05-01T09:30:00Z', comment: 'Submitted.', user: 'Zandra Kanja' },
      { id: 'h-122', status: 'Approved', date: '2026-05-01T11:00:00Z', comment: 'Approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-013',
    date: '2026-05-10',
    time: '10:00',
    dateOfActivity: '2026-05-08',
    staffName: 'Marcus Chen',
    staffId: 'S-202',
    department: 'Field Surveys',
    status: 'Approved',
    activityType: 'Hospital Visit',
    meetingType: 'Physical',
    institutionName: 'City General Hospital',
    location: 'Boston, MA',
    notes: 'Reviewed student rotations. Train ticket and logistics claimed.',
    costOfVisit: 510,
    dateTime: '2026-05-10T10:00',
    attachments: [],
    history: [
      { id: 'h-131', status: 'Pending', date: '2026-05-10T10:30:00Z', comment: 'Submitted.', user: 'Marcus Chen' },
      { id: 'h-132', status: 'Approved', date: '2026-05-10T12:00:00Z', comment: 'Approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-014',
    date: '2026-05-14',
    time: '16:00',
    dateOfActivity: '2026-05-13',
    staffName: 'Eleanor Vance',
    staffId: 'S-203',
    department: 'Clinical Outreach',
    status: 'Approved',
    activityType: 'Follow ups',
    meetingType: 'Virtual',
    institutionName: 'Grace Clinic Centre',
    location: 'Chicago, IL',
    notes: 'Virtual coordination call on hospital orientation logistics.',
    costOfVisit: 95,
    dateTime: '2026-05-14T16:00',
    attachments: [],
    history: [
      { id: 'h-141', status: 'Pending', date: '2026-05-14T16:30:00Z', comment: 'Submitted.', user: 'Eleanor Vance' },
      { id: 'h-142', status: 'Approved', date: '2026-05-14T17:00:00Z', comment: 'Approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-015',
    date: '2026-05-18',
    time: '08:30',
    dateOfActivity: '2026-05-17',
    staffName: 'Marcus Chen',
    staffId: 'S-202',
    department: 'Field Surveys',
    status: 'Approved',
    activityType: 'Participation in Conferences',
    meetingType: 'Physical',
    institutionName: 'Stanford School of Medicine',
    location: 'Stanford, CA',
    notes: 'Attended the Stanford Academic Medical Conference. Shared RMS placement program brochures. Flight tickets and registration claimed.',
    costOfVisit: 680,
    dateTime: '2026-05-18T08:30',
    attachments: [],
    history: [
      { id: 'h-151', status: 'Pending', date: '2026-05-18T09:00:00Z', comment: 'Submitted.', user: 'Marcus Chen' },
      { id: 'h-152', status: 'Approved', date: '2026-05-18T11:00:00Z', comment: 'Approved.', user: 'Riya Joffy' }
    ]
  },
  {
    id: 'REP-2026-016',
    date: '2026-05-22',
    time: '14:30',
    dateOfActivity: '2026-05-21',
    staffName: 'Eleanor Vance',
    staffId: 'S-203',
    department: 'Clinical Outreach',
    status: 'Pending',
    activityType: 'SPOC Meeting',
    meetingType: 'Telephonic',
    institutionName: 'State Medical University',
    location: 'New York, NY',
    notes: 'Telephone meeting with dean SPOC on clinical seat reservations. Pending final approval.',
    costOfVisit: 310,
    dateTime: '2026-05-22T14:30',
    attachments: [],
    history: [
      { id: 'h-161', status: 'Pending', date: '2026-05-22T15:00:00Z', comment: 'Submitted.', user: 'Eleanor Vance' }
    ]
  },
  {
    id: 'REP-2026-017',
    date: '2026-05-24',
    time: '10:00',
    dateOfActivity: '2026-05-23',
    staffName: 'Zandra Kanja',
    staffId: 'S-201',
    department: 'Market Analysis',
    status: 'Pending',
    activityType: 'Campaigns Conducted',
    meetingType: 'Physical',
    institutionName: 'City General Hospital',
    location: 'Boston, MA',
    notes: 'Conducted a mini orientation seminar. Claims for promotional supplies pending audit.',
    costOfVisit: 400,
    dateTime: '2026-05-24T10:00',
    attachments: [],
    history: [
      { id: 'h-171', status: 'Pending', date: '2026-05-24T10:30:00Z', comment: 'Submitted orientation campaign report.', user: 'Zandra Kanja' }
    ]
  }
];

const DEFAULT_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    userId: 'S-201',
    userName: 'Marcus Chen',
    userRole: 'staff',
    action: 'Submitted Report',
    timestamp: '2026-05-18T14:45:00Z',
    details: 'Submitted report REP-2026-001 (Competitor Intelligence) for North America.'
  },
  {
    id: 'log-2',
    userId: 'A-101',
    userName: 'Eleanor Vance',
    userRole: 'admin',
    action: 'Approved Report',
    timestamp: '2026-05-18T17:30:00Z',
    details: 'Approved report REP-2026-001 from Marcus Chen with feedback.'
  }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [];

// Helper to initialize and retrieve local storage keys
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing key ${key} to localStorage:`, error);
  }
};

const KEYS = {
  USERS: 'rms_db_users',
  REPORTS: 'rms_db_reports',
  LOGS: 'rms_db_logs',
  NOTIFICATIONS: 'rms_db_notifications',
  ORGANIZATIONS: 'rms_db_organizations',
  CREDENTIALS: 'rms_user_credentials',
};

// Cached values for live queries (sync context)
let liveReportsCache: MarketReport[] = [];
let liveUsersCache: User[] = [];
let liveLogsCache: ActivityLog[] = [];
let liveNotificationsCache: Notification[] = [];
let liveOrganizationsCache: Organization[] = [];

const mapReportDoc = (snap: QueryDocumentSnapshot<DocumentData>): MarketReport => {
  const data = snap.data() as MarketReport;
  return { ...data, id: data.id || snap.id };
};

const mapUserDoc = (snap: QueryDocumentSnapshot<DocumentData>): User => {
  const data = snap.data() as User;
  return {
    ...data,
    id: data.id || snap.id,
    role: resolveUserRole(data.role, data.email),
  };
};

const upsertUserInCache = (user: User) => {
  const idx = liveUsersCache.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    const next = [...liveUsersCache];
    next[idx] = user;
    liveUsersCache = next;
  } else {
    liveUsersCache = [user, ...liveUsersCache];
  }
};

const upsertReportInCache = (report: MarketReport) => {
  const idx = liveReportsCache.findIndex((r) => r.id === report.id);
  if (idx >= 0) {
    const next = [...liveReportsCache];
    next[idx] = report;
    liveReportsCache = next;
  } else {
    liveReportsCache = [report, ...liveReportsCache];
  }
};

// ==========================================
// 2. Database Services (Direct API)
// ==========================================

export const dbService = {
  // --- ORGANIZATIONS ---
  getOrganizations: (): Organization[] => {
    if (!isFirebaseActive()) {
      const stored = getStorageItem<Organization[]>(KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
      if (stored.length === 0 || !stored.some(o => o.id === 'org-stjude')) {
        setStorageItem(KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
        return DEFAULT_ORGANIZATIONS;
      }
      return stored;
    }
    return liveOrganizationsCache;
  },

  addOrganization: async (orgData: Omit<Organization, 'id'>): Promise<Organization> => {
    if (!isFirebaseActive()) {
      const orgs = dbService.getOrganizations();
      const existing = orgs.find(o => o.name.toLowerCase() === orgData.name.toLowerCase() && o.type === orgData.type);
      if (existing) return existing;

      const newOrg: Organization = {
        ...orgData,
        id: `org-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      orgs.push(newOrg);
      setStorageItem(KEYS.ORGANIZATIONS, orgs);
      return newOrg;
    }

    const orgsCollectionRef = collection(db, 'organizations');
    const existing = liveOrganizationsCache.find(o => o.name.toLowerCase() === orgData.name.toLowerCase() && o.type === orgData.type);
    if (existing) return existing;

    const docRef = await addDoc(orgsCollectionRef, orgData);
    await updateDoc(doc(db, 'organizations', docRef.id), { id: docRef.id });
    
    return {
      ...orgData,
      id: docRef.id
    };
  },

  updateOrganization: async (orgId: string, orgData: Partial<Organization>): Promise<void> => {
    if (!isFirebaseActive()) {
      const orgs = dbService.getOrganizations();
      const index = orgs.findIndex(o => o.id === orgId);
      if (index !== -1) {
        orgs[index] = { ...orgs[index], ...orgData };
        setStorageItem(KEYS.ORGANIZATIONS, orgs);
      }
      return;
    }

    const orgDocRef = doc(db, 'organizations', orgId);
    await updateDoc(orgDocRef, orgData);
  },

  deleteOrganization: async (orgId: string): Promise<void> => {
    if (!isFirebaseActive()) {
      const orgs = dbService.getOrganizations();
      const filtered = orgs.filter(o => o.id !== orgId);
      setStorageItem(KEYS.ORGANIZATIONS, filtered);
      return;
    }

    const orgDocRef = doc(db, 'organizations', orgId);
    await deleteDoc(orgDocRef);
  },

  // --- USERS ---
  getUsers: (): User[] => {
    if (!isFirebaseActive()) {
      return getStorageItem(KEYS.USERS, DEFAULT_USERS);
    }
    return liveUsersCache;
  },

  addUser: async (userData: Omit<User, 'id'>, adminName: string, password: string): Promise<User> => {
    const emailKey = userData.email.trim().toLowerCase();

    if (!isFirebaseActive()) {
      const users = dbService.getUsers();
      if (users.some((u) => u.email.toLowerCase() === emailKey)) {
        throw new Error('A user with this email already exists.');
      }

      const newUser: User = {
        ...userData,
        email: userData.email.trim(),
        role: resolveUserRole(userData.role, userData.email),
        id: `U-${Date.now()}`,
      };
      users.push(newUser);
      setStorageItem(KEYS.USERS, users);

      const credentials = getStorageItem<Record<string, string>>(KEYS.CREDENTIALS, {});
      credentials[emailKey] = password;
      setStorageItem(KEYS.CREDENTIALS, credentials);

      await dbService.addLog({
        userId: 'A-101',
        userName: adminName,
        userRole: 'admin',
        action: 'Created User',
        details: `Created new ${newUser.role} account for ${newUser.name}.`,
      });

      return newUser;
    }

    const existing = dbService.getUsers().find((u) => u.email.toLowerCase() === emailKey);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    console.log('[DbService] Creating Firebase Auth user and Firestore profile...');
    const uid = await createAuthUser(userData.email, password);

    const newUser: User = {
      ...userData,
      id: uid,
      email: userData.email.trim(),
      role: resolveUserRole(userData.role, userData.email),
    };

    await setDoc(doc(db, 'users', uid), newUser);
    upsertUserInCache(newUser);

    await dbService.addLog({
      userId: 'A-101',
      userName: adminName,
      userRole: 'admin',
      action: 'Created User',
      details: `Created new ${newUser.role} account for ${newUser.name} (Auth UID: ${uid}).`,
    });

    return newUser;
  },

  updateUserStatus: (userId: string, status: 'active' | 'suspended', adminName: string): User[] => {
    if (!isFirebaseActive()) {
      const users = dbService.getUsers();
      const index = users.findIndex(u => u.id === userId);
      if (index !== -1) {
        const user = users[index];
        user.status = status;
        users[index] = user;
        setStorageItem(KEYS.USERS, users);

        dbService.addLog({
          userId: 'A-101',
          userName: adminName,
          userRole: 'admin',
          action: status === 'active' ? 'Activated User' : 'Deactivated User',
          details: `${status === 'active' ? 'Activated' : 'Suspended'} staff account of ${user.name}.`
        });

      }
      return users;
    }

    // LIVE FIRESTORE IMPLEMENTATION
    console.log("[DbService] Updating user access status in live Firestore...");
    const userDocRef = doc(db, 'users', userId);
    updateDoc(userDocRef, { status }).then(() => {
      // Async record activity log and notifications in Firestore
      dbService.addLog({
        userId: 'A-101',
        userName: adminName,
        userRole: 'admin',
        action: status === 'active' ? 'Activated User' : 'Deactivated User',
        details: `${status === 'active' ? 'Activated' : 'Suspended'} account of user UID: ${userId}.`
      });

    });

    // In live mode, UI sync is driven by the snapshot listeners in Context, return current cache
    return liveUsersCache;
  },

  // --- REPORTS ---
  getReports: (): MarketReport[] => {
    if (!isFirebaseActive()) {
      const stored = getStorageItem<MarketReport[]>(KEYS.REPORTS, []);
      // Auto-reseed with comprehensive fake dataset if reports are fewer than 12
      if (stored.length < 12) {
        setStorageItem(KEYS.REPORTS, DEFAULT_REPORTS);
        return DEFAULT_REPORTS;
      }
      return stored;
    }
    return liveReportsCache;
  },

  addReport: async (
    reportData: Omit<MarketReport, 'id' | 'history' | 'feedback'> & { id?: string; status?: 'Pending' | 'Draft' },
    staffName: string
  ): Promise<MarketReport> => {
    const isEdit = !!reportData.id;
    const finalStatus = reportData.status || 'Pending';

    if (!isFirebaseActive()) {
      const reports = dbService.getReports();
      let finalReport: MarketReport;

      if (isEdit) {
        const index = reports.findIndex(r => r.id === reportData.id);
        if (index !== -1) {
          const oldReport = reports[index];
          finalReport = {
            ...oldReport,
            ...reportData,
            id: reportData.id!,
            status: finalStatus,
            history: [
              ...oldReport.history,
              {
                id: `h-${Date.now()}`,
                status: finalStatus,
                date: new Date().toISOString(),
                comment: finalStatus === 'Draft' 
                  ? 'Draft updated.' 
                  : 'Report compiled and submitted for review.',
                user: staffName
              }
            ]
          } as MarketReport;
          reports[index] = finalReport;
        } else {
          // Fallback if ID is provided but not found
          finalReport = {
            ...reportData,
            id: reportData.id!,
            status: finalStatus,
            history: [
              {
                id: `h-${Date.now()}`,
                status: finalStatus,
                date: new Date().toISOString(),
                comment: finalStatus === 'Draft' 
                  ? 'Draft created.' 
                  : 'Report created and submitted for review.',
                user: staffName
              }
            ]
          } as MarketReport;
          reports.unshift(finalReport);
        }
      } else {
        const newId = `REP-2026-${String(reports.length + 1).padStart(3, '0')}`;
        finalReport = {
          ...reportData,
          id: newId,
          status: finalStatus,
          history: [
            {
              id: `h-${Date.now()}`,
              status: finalStatus,
              date: new Date().toISOString(),
              comment: finalStatus === 'Draft' 
                ? 'Draft saved.' 
                : 'Report created and submitted for review.',
              user: staffName
            }
          ]
        } as MarketReport;
        reports.unshift(finalReport);
      }

      setStorageItem(KEYS.REPORTS, reports);

      dbService.addLog({
        userId: reportData.staffId,
        userName: staffName,
        userRole: 'staff',
        action: finalStatus === 'Draft' ? 'Saved Draft' : 'Submitted Report',
        details: `${finalStatus === 'Draft' ? 'Saved draft' : 'Submitted report'} ${finalReport.id} for ${reportData.institutionName} in ${reportData.location}.`
      });

      return finalReport;
    }

    // LIVE FIRESTORE IMPLEMENTATION
    console.log("[DbService] Upserting report in live Firestore...");
    const historyEntry = {
      id: `h-${Date.now()}`,
      status: finalStatus,
      date: new Date().toISOString(),
      comment: isEdit
        ? (finalStatus === 'Draft' ? 'Draft report updated.' : 'Draft report finalized and submitted.')
        : (finalStatus === 'Draft' ? 'Draft saved.' : 'Report created and submitted for review.'),
      user: staffName,
    };

    let finalReport: MarketReport;

    if (isEdit && reportData.id) {
      const docRef = doc(db, 'reports', reportData.id);
      const existingSnap = await getDoc(docRef);
      const existingHistory = existingSnap.exists()
        ? ((existingSnap.data() as MarketReport).history ?? [])
        : [];

      finalReport = {
        ...(existingSnap.exists() ? (existingSnap.data() as MarketReport) : {}),
        ...reportData,
        id: reportData.id,
        status: finalStatus,
        history: [...existingHistory, historyEntry],
      } as MarketReport;

      await setDoc(docRef, finalReport, { merge: true });
    } else {
      const newDocRef = doc(collection(db, 'reports'));
      finalReport = {
        ...reportData,
        id: newDocRef.id,
        status: finalStatus,
        history: [historyEntry],
      } as MarketReport;

      await setDoc(newDocRef, finalReport);
    }

    upsertReportInCache(finalReport);

    await dbService.addLog({
      userId: reportData.staffId,
      userName: staffName,
      userRole: 'staff',
      action: finalStatus === 'Draft' ? 'Saved Draft' : 'Submitted Report',
      details: `${finalStatus === 'Draft' ? 'Saved draft' : 'Submitted report'} ${finalReport.id} for ${reportData.institutionName || reportData.hospitalName || reportData.conferenceName || 'visit'}.`,
    });

    return finalReport;
  },

  updateReportStatus: (
    reportId: string, 
    status: 'Approved' | 'Rejected', 
    feedback: string, 
    adminId: string, 
    adminName: string
  ): MarketReport | undefined => {
    if (!isFirebaseActive()) {
      const reports = dbService.getReports();
      const index = reports.findIndex(r => r.id === reportId);
      if (index === -1) return undefined;

      const report = reports[index];
      report.status = status;
      report.feedback = feedback;
      
      report.history.push({
        id: `h-${Date.now()}`,
        status,
        date: new Date().toISOString(),
        comment: feedback || `${status} by administration.`,
        user: adminName
      });

      reports[index] = report;
      setStorageItem(KEYS.REPORTS, reports);

      dbService.addLog({
        userId: adminId,
        userName: adminName,
        userRole: 'admin',
        action: status === 'Approved' ? 'Approved Report' : 'Rejected Report',
        details: `${status === 'Approved' ? 'Approved' : 'Rejected'} report ${reportId} from ${report.staffName}.`
      });

      return report;
    }

    // LIVE FIRESTORE IMPLEMENTATION
    console.log("[DbService] Committing report decision in live Firestore...");
    const reportRef = doc(db, 'reports', reportId);
    
    getDoc(reportRef).then((reportSnap) => {
      if (!reportSnap.exists()) return;
      const report = reportSnap.data() as MarketReport;
      
      const newHistory = [...(report.history || [])];
      newHistory.push({
        id: `h-${Date.now()}`,
        status,
        date: new Date().toISOString(),
        comment: feedback || `${status} review completed.`,
        user: adminName
      });

      updateDoc(reportRef, {
        status,
        feedback,
        history: newHistory
      }).then(() => {
        dbService.addLog({
          userId: adminId,
          userName: adminName,
          userRole: 'admin',
          action: status === 'Approved' ? 'Approved Report' : 'Rejected Report',
          details: `Audited and ${status} report document ID ${reportId}.`
        });

      });
    });

    return undefined;
  },

  deleteReport: async (reportId: string, userId: string, userName: string): Promise<void> => {
    if (!isFirebaseActive()) {
      const reports = dbService.getReports();
      const filtered = reports.filter(r => r.id !== reportId);
      setStorageItem(KEYS.REPORTS, filtered);

      await dbService.addLog({
        userId,
        userName,
        userRole: 'admin',
        action: 'Deleted Report',
        details: `Deleted report document ID ${reportId}.`
      });
      return;
    }

    const reportDocRef = doc(db, 'reports', reportId);
    await deleteDoc(reportDocRef);

    await dbService.addLog({
      userId,
      userName,
      userRole: 'admin',
      action: 'Deleted Report',
      details: `Deleted report document ID ${reportId}.`
    });
  },

  // --- LOGS ---
  getLogs: (): ActivityLog[] => {
    if (!isFirebaseActive()) {
      return getStorageItem(KEYS.LOGS, DEFAULT_LOGS);
    }
    return liveLogsCache.length > 0 ? liveLogsCache : DEFAULT_LOGS;
  },

  addLog: async (logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> => {
    if (!isFirebaseActive()) {
      const logs = dbService.getLogs();
      const newLog: ActivityLog = {
        ...logData,
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString()
      };
      logs.unshift(newLog);
      setStorageItem(KEYS.LOGS, logs);
      return newLog;
    }

    // WRITE LOG TO FIRESTORE
    try {
      const logsCollectionRef = collection(db, 'activity_logs');
      const newLogDoc = {
        ...logData,
        timestamp: new Date().toISOString()
      };
      const docRef = await addDoc(logsCollectionRef, newLogDoc);
      await updateDoc(doc(db, 'activity_logs', docRef.id), { id: docRef.id });
      
      return {
        ...newLogDoc,
        id: docRef.id
      };
    } catch (e) {
      console.warn("Firestore logging failed", e);
      return {
        ...logData,
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    }
  },

  // --- NOTIFICATIONS ---
  getNotifications: (userId?: string): Notification[] => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      if (userId) {
        return notifs.filter(n => n.userId === userId);
      }
      return notifs;
    }

    if (userId) {
      return liveNotificationsCache.filter(n => n.userId === userId);
    }
    return liveNotificationsCache;
  },

  addNotification: async (notifData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      const newNotif: Notification = {
        ...notifData,
        id: `nt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      notifs.unshift(newNotif);
      setStorageItem(KEYS.NOTIFICATIONS, notifs);
      return newNotif;
    }

    // WRITE NOTIFICATION TO FIRESTORE
    try {
      const notifCollectionRef = collection(db, 'notifications');
      const newNotifDoc = {
        ...notifData,
        timestamp: new Date().toISOString(),
        read: false
      };
      const docRef = await addDoc(notifCollectionRef, newNotifDoc);
      await updateDoc(doc(db, 'notifications', docRef.id), { id: docRef.id });
      return {
        ...newNotifDoc,
        id: docRef.id
      };
    } catch (e) {
      console.warn("Firestore notifications push failed", e);
      return {
        ...notifData,
        id: `nt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false
      };
    }
  },

  markNotificationAsRead: (notificationId: string): void => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      const index = notifs.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        notifs[index].read = true;
        setStorageItem(KEYS.NOTIFICATIONS, notifs);
      }
      return;
    }

    // LIVE UPDATE FIRESTORE
    updateDoc(doc(db, 'notifications', notificationId), { read: true });
  },

  markAllNotificationsAsRead: (userId: string): void => {
    if (!isFirebaseActive()) {
      const notifs = getStorageItem(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
      const updated = notifs.map(n => n.userId === userId ? { ...n, read: true } : n);
      setStorageItem(KEYS.NOTIFICATIONS, updated);
      return;
    }

    // Query unread items for user and commit updates
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      where('read', '==', false)
    );
    
    getDocs(q).then((snap) => {
      snap.forEach((dDoc) => {
        updateDoc(doc(db, 'notifications', dDoc.id), { read: true });
      });
    });
  },

  // --- STATS ---
  getDashboardStats: (): DashboardStats => {
    const reportsList = dbService.getReports();
    const usersList = dbService.getUsers();
    
    const activeStaff = usersList.filter(u => !isAdminRole(u.role) && u.status === 'active').length;
    const total = reportsList.length;
    const pending = reportsList.filter(r => r.status === 'Pending').length;
    const approved = reportsList.filter(r => r.status === 'Approved').length;
    const rejected = reportsList.filter(r => r.status === 'Rejected').length;
    
    const satisfiedReports = reportsList.filter(r => r.metrics?.customerSatisfaction);
    const avgSatisfaction = satisfiedReports.length > 0
      ? satisfiedReports.reduce((acc, curr) => acc + (curr.metrics?.customerSatisfaction || 0), 0) / satisfiedReports.length
      : 4.2;

    return {
      totalReports: total,
      pendingReports: pending,
      approvedReports: approved,
      rejectedReports: rejected,
      activeStaffCount: activeStaff,
      monthlyGrowthRate: 14.5,
      averageSatisfaction: Math.round(avgSatisfaction * 10) / 10
    };
  },

  /** Real-time (or local) user directory — used by admin Staff Directory. */
  subscribeUsers: (onUsersChange: (users: User[]) => void): (() => void) => {
    if (!isFirebaseActive()) {
      onUsersChange(dbService.getUsers());
      return () => {};
    }

    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const items = snap.docs.map(mapUserDoc);
      liveUsersCache = items;
      onUsersChange(items);
    });

    return unsub;
  },

  // --- LIVE SNAPSHOT INJECTORS (Call from Providers for Real-time listeners) ---
  syncLiveCollections: (
    onReportsChange: (reps: MarketReport[]) => void,
    onUsersChange: (usrs: User[]) => void,
    onLogsChange: (logs: ActivityLog[]) => void,
    onOrganizationsChange: (orgs: Organization[]) => void
  ): () => void => {
    if (!isFirebaseActive()) {
      return () => {};
    }

    console.log("[DbService] Registering real-time Firestore listeners...");

    const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
      const items = snap.docs.map(mapReportDoc);
      liveReportsCache = items;
      onReportsChange(items);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const items = snap.docs.map(mapUserDoc);
      liveUsersCache = items;
      onUsersChange(items);
    });

    const unsubLogs = onSnapshot(collection(db, 'activity_logs'), (snap) => {
      const items: ActivityLog[] = snap.docs.map((d) => {
        const data = d.data() as ActivityLog;
        return { ...data, id: data.id || d.id };
      });
      liveLogsCache = items;
      onLogsChange(items);
    });

    const unsubOrganizations = onSnapshot(collection(db, 'organizations'), (snap) => {
      const items: Organization[] = snap.docs.map((d) => {
        const data = d.data() as Organization;
        return { ...data, id: data.id || d.id };
      });
      liveOrganizationsCache = items;
      onOrganizationsChange(items);
    });

    return () => {
      unsubReports();
      unsubUsers();
      unsubLogs();
      unsubOrganizations();
      console.log("[DbService] Unsubscribed real-time queries.");
    };
  }
};
