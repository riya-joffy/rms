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
  region: string;
  staffName: string;
  staffId: string;
  department: string;
  category: 'Competitor Intelligence' | 'Consumer Trends' | 'Pricing Analysis' | 'Inventory & Supply' | 'Promotional Tracking';
  observations: string;
  metrics: MarketMetrics;
  issuesFound: string;
  recommendations: string;
  attachments: Attachment[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Draft';
  feedback?: string;
  history: ReportHistory[];
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
