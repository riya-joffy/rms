export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  region?: string;
  avatar: string;
  status: 'active' | 'suspended';
  lastActive: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'Institution' | 'Hospital' | 'Conference';
  location: string;
  
  // Institutes
  finalYearStudentsCount?: number;
  headOfInstitution?: string;
  headContact?: string;
  spocName?: string;
  spocContact?: string;
  spocEmail?: string;

  // Hospitals
  numberOfBeds?: number;
  numberOfEmployees?: number;
  headOfHospital?: string;
  contactNumber?: string;
  headOfHr?: string;
  hrContact?: string;
  hrEmail?: string;

  // Conferences
  targetProfessionals?: string;
  numberOfParticipants?: number;
}


export interface MarketMetrics {
  footTraffic: 'Low' | 'Medium' | 'High';
  salesVolume: number; // in USD
  competitorPricingIndex: number; // 0-100 (comparison baseline)
  customerSatisfaction: number; // 1-5 stars
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

export interface ReportHistory {
  id: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Draft';
  date: string;
  comment: string;
  user: string;
}

export interface MarketReport {
  id: string;
  date: string;
  time: string;
  region?: string;
  staffName: string;
  staffId: string;
  department: string;
  category?: 'Competitor Intelligence' | 'Consumer Trends' | 'Pricing Analysis' | 'Inventory & Supply' | 'Promotional Tracking';
  observations?: string;
  metrics?: MarketMetrics;
  issuesFound?: string;
  recommendations?: string;
  attachments: Attachment[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Draft';
  feedback?: string;
  history: ReportHistory[];

  // Dynamic Form Fields
  activityType: string;
  meetingType?: string; // Kept for legacy
  dateTime?: string; // Kept for legacy
  notes?: string; // Kept for legacy
  
  // Common across many
  location?: string;
  costOfVisit?: number;
  marketingObservation?: string;
  
  // Entity Names
  institutionName?: string;
  hospitalName?: string;
  conferenceName?: string;
  
  // Meetings with Institutes
  finalYearStudentsCount?: number;
  headOfInstitution?: string;
  headContact?: string;
  spocName?: string;
  spocContact?: string;
  spocEmail?: string;
  
  // Follow ups
  dateOfActivity?: string;
  feedbackFromClient?: string;
  modeOfMeeting?: string;
  
  // Campaigns Conducted
  numberOfStudentsAttended?: number;
  numberOfStudentsRegistered?: number;
  listOfStudentsCaptured?: string;
  
  // Participation in Conferences
  targetProfessionals?: string;
  numberOfParticipants?: number;
  footFallsOfParticipants?: number;
  numberOfRegistrations?: number;
  
  // Meetings with Hospitals
  numberOfBeds?: number;
  numberOfEmployees?: number;
  headOfHospital?: string;
  contactNumber?: string;
  headOfHr?: string;
  hrContact?: string;
  hrEmail?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  timestamp: string;
  details: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  reportId?: string;
}

export interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
  activeStaffCount: number;
  monthlyGrowthRate: number;
  averageSatisfaction: number;
}
