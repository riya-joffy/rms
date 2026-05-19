import { User, MarketReport, ActivityLog, Notification, DashboardStats } from '../../types';
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
  serverTimestamp 
} from 'firebase/firestore';

// Helper to determine if real Firebase is configured
const isFirebaseActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return !!apiKey && apiKey !== 'YOUR_API_KEY_HERE';
};

// ==========================================
// 1. Initial Mock / Seed Data
// ==========================================

const DEFAULT_USERS: User[] = [
  {
    id: 'A-101',
    name: 'Eleanor Vance',
    email: 'admin@rms.com',
    role: 'admin',
    department: 'Operations',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'active',
    lastActive: '2026-05-19T17:42:00Z',
  },
  {
    id: 'S-201',
    name: 'Marcus Chen',
    email: 'marcus@rms.com',
    role: 'staff',
    department: 'Market Analysis',
    region: 'North America',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'active',
    lastActive: '2026-05-19T17:55:00Z',
  },
  {
    id: 'S-202',
    name: 'Sarah Jenkins',
    email: 'sarah@rms.com',
    role: 'staff',
    department: 'Business Intelligence',
    region: 'Europe',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    status: 'active',
    lastActive: '2026-05-19T16:30:00Z',
  },
  {
    id: 'S-203',
    name: 'Elena Rostova',
    email: 'elena@rms.com',
    role: 'staff',
    department: 'Retail Insights',
    region: 'Asia Pacific',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    status: 'suspended',
    lastActive: '2026-05-15T09:15:00Z',
  },
  {
    id: 'S-204',
    name: 'David Kim',
    email: 'david@rms.com',
    role: 'staff',
    department: 'Consumer Research',
    region: 'Latin America',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'active',
    lastActive: '2026-05-19T11:20:00Z',
  }
];

const DEFAULT_REPORTS: MarketReport[] = [
  {
    id: 'REP-2026-001',
    date: '2026-05-18',
    time: '14:30',
    region: 'North America',
    staffName: 'Marcus Chen',
    staffId: 'S-201',
    department: 'Market Analysis',
    category: 'Competitor Intelligence',
    observations: 'Major competitor "GlobalMart" launched a aggressive pricing campaign in the tri-state area. Offering buy-one-get-one 50% off on all organic food lines. Store footprints show a 15% increase in their average basket size over the weekend. Our local outlets have noticed a temporary dip in organic produce sales as a result.',
    metrics: {
      footTraffic: 'High',
      salesVolume: 84500,
      competitorPricingIndex: 88,
      customerSatisfaction: 4.2
    },
    issuesFound: 'Our pricing response was delayed. Store managers lack autonomy to issue regional discounts, making it hard to match promotional spikes quickly.',
    recommendations: 'Implement an automated regional matching program for organic groceries. Empower regional managers to adjust prices within a +/- 10% corridor to counter immediate localized campaigns.',
    attachments: [
      { id: 'att-1', name: 'competitor_flyer.pdf', size: '1.8 MB', type: 'application/pdf', url: '#' }
    ],
    status: 'Approved',
    feedback: 'Excellent observation. We have briefed the pricing committee on your regional manager suggestion and are piloting it in NY-03 next month.',
    history: [
      { id: 'h-11', status: 'Pending', date: '2026-05-18T14:45:00Z', comment: 'Initial submission', user: 'Marcus Chen' },
      { id: 'h-12', status: 'Approved', date: '2026-05-18T17:30:00Z', comment: 'Excellent analysis, regional matching approved for pilot.', user: 'Eleanor Vance' }
    ]
  },
  {
    id: 'REP-2026-002',
    date: '2026-05-19',
    time: '09:15',
    region: 'Europe',
    staffName: 'Sarah Jenkins',
    staffId: 'S-202',
    department: 'Business Intelligence',
    category: 'Consumer Trends',
    observations: 'Post-holiday audits in UK and Germany flag a massive spike in eco-friendly and biodegradable personal care item demand. Zero-waste packaging products saw a 34% month-over-month increase. Customers are actively asking store staff about sustainable product sourcing and carbon footprint tracking.',
    metrics: {
      footTraffic: 'Medium',
      salesVolume: 92000,
      competitorPricingIndex: 105,
      customerSatisfaction: 4.7
    },
    issuesFound: 'Suppliers for eco-certified items are currently bottlenecked in Europe. Several key SKUs are running below critical inventory levels (3-4 days remaining).',
    recommendations: 'Onboard secondary supplier in Southern Europe immediately to address freight delays. Set up prominent "Green Corner" displays at entrance nodes.',
    attachments: [
      { id: 'att-3', name: 'euro_sustainability_survey.pdf', size: '3.1 MB', type: 'application/pdf', url: '#' }
    ],
    status: 'Pending',
    history: [
      { id: 'h-21', status: 'Pending', date: '2026-05-19T09:30:00Z', comment: 'Submitted for weekly review.', user: 'Sarah Jenkins' }
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

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'nt-1',
    userId: 'S-201',
    title: 'Report Approved',
    message: 'Your report REP-2026-001 has been approved by Admin Eleanor Vance.',
    timestamp: '2026-05-18T17:30:00Z',
    read: false,
    type: 'success',
    reportId: 'REP-2026-001'
  }
];

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
};

// Cached values for live queries (sync context)
let liveReportsCache: MarketReport[] = [];
let liveUsersCache: User[] = [];
let liveLogsCache: ActivityLog[] = [];
let liveNotificationsCache: Notification[] = [];

// ==========================================
// 2. Database Services (Direct API)
// ==========================================

export const dbService = {
  // --- USERS ---
  getUsers: (): User[] => {
    if (!isFirebaseActive()) {
      return getStorageItem(KEYS.USERS, DEFAULT_USERS);
    }
    // Return local cache when queries are active in context
    return liveUsersCache.length > 0 ? liveUsersCache : DEFAULT_USERS;
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

        dbService.addNotification({
          userId: user.id,
          title: status === 'active' ? 'Account Re-activated' : 'Account Suspended',
          message: status === 'active' 
            ? `Your staff account has been re-activated by ${adminName}.`
            : `Your staff account has been suspended by ${adminName}. Please contact support.`,
          type: status === 'active' ? 'success' : 'error'
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

      dbService.addNotification({
        userId,
        title: status === 'active' ? 'Account Active' : 'Account Suspended',
        message: status === 'active' 
          ? `Your staff profile was re-activated by admin ${adminName}.`
          : `Your staff profile was suspended by admin ${adminName}.`,
        type: status === 'active' ? 'success' : 'error'
      });
    });

    // In live mode, UI sync is driven by the snapshot listeners in Context, return current cache
    return liveUsersCache;
  },

  // --- REPORTS ---
  getReports: (): MarketReport[] => {
    if (!isFirebaseActive()) {
      return getStorageItem(KEYS.REPORTS, DEFAULT_REPORTS);
    }
    return liveReportsCache.length > 0 ? liveReportsCache : DEFAULT_REPORTS;
  },

  addReport: (reportData: Omit<MarketReport, 'id' | 'status' | 'history' | 'feedback'>, staffName: string): MarketReport => {
    if (!isFirebaseActive()) {
      const reports = dbService.getReports();
      const newId = `REP-2026-${String(reports.length + 1).padStart(3, '0')}`;
      
      const newReport: MarketReport = {
        ...reportData,
        id: newId,
        status: 'Pending',
        history: [
          {
            id: `h-${Date.now()}`,
            status: 'Pending',
            date: new Date().toISOString(),
            comment: 'Report created and submitted for review.',
            user: staffName
          }
        ]
      };

      reports.unshift(newReport);
      setStorageItem(KEYS.REPORTS, reports);

      dbService.addLog({
        userId: reportData.staffId,
        userName: staffName,
        userRole: 'staff',
        action: 'Submitted Report',
        details: `Submitted report ${newId} (${reportData.category}) for ${reportData.region}.`
      });

      const admins = dbService.getUsers().filter(u => u.role === 'admin');
      admins.forEach(admin => {
        dbService.addNotification({
          userId: admin.id,
          title: 'New Report Submitted',
          message: `${staffName} submitted report ${newId} for ${reportData.region}.`,
          type: 'info',
          reportId: newId
        });
      });

      return newReport;
    }

    // LIVE FIRESTORE IMPLEMENTATION
    console.log("[DbService] Writing new report to live Firestore...");
    const reportCollectionRef = collection(db, 'reports');
    
    // We generate a timestamp for incremental indexing
    const pendingId = `REP-${Date.now().toString().slice(-6)}`;
    const firestoreReportDoc: Omit<MarketReport, 'id'> = {
      ...reportData,
      status: 'Pending',
      history: [
        {
          id: `h-${Date.now()}`,
          status: 'Pending',
          date: new Date().toISOString(),
          comment: 'Report compiled and uploaded directly to Firestore collection.',
          user: staffName
        }
      ]
    };

    addDoc(reportCollectionRef, firestoreReportDoc).then((docRef) => {
      // Update with generated Document ID as report ID for strict compatibility
      updateDoc(doc(db, 'reports', docRef.id), { id: docRef.id });

      // Log actions
      dbService.addLog({
        userId: reportData.staffId,
        userName: staffName,
        userRole: 'staff',
        action: 'Submitted Report',
        details: `Submitted database report ${docRef.id} (${reportData.category}).`
      });
    });

    // Return visual representation temporarily
    return {
      ...reportData,
      id: pendingId,
      status: 'Pending',
      history: []
    };
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

      dbService.addNotification({
        userId: report.staffId,
        title: `Report ${status}`,
        message: `Your report ${reportId} was ${status.toLowerCase()} by ${adminName}.`,
        type: status === 'Approved' ? 'success' : 'error',
        reportId
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

        dbService.addNotification({
          userId: report.staffId,
          title: `Report ${status}`,
          message: `Your report document ${reportId} review status: ${status}. Feedback: "${feedback}"`,
          type: status === 'Approved' ? 'success' : 'error',
          reportId
        });
      });
    });

    return undefined;
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
    
    const activeStaff = usersList.filter(u => u.role === 'staff' && u.status === 'active').length;
    const total = reportsList.length;
    const pending = reportsList.filter(r => r.status === 'Pending').length;
    const approved = reportsList.filter(r => r.status === 'Approved').length;
    const rejected = reportsList.filter(r => r.status === 'Rejected').length;
    
    const satisfiedReports = reportsList.filter(r => r.metrics?.customerSatisfaction);
    const avgSatisfaction = satisfiedReports.length > 0
      ? satisfiedReports.reduce((acc, curr) => acc + curr.metrics.customerSatisfaction, 0) / satisfiedReports.length
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

  // --- LIVE SNAPSHOT INJECTORS (Call from Providers for Real-time listeners) ---
  syncLiveCollections: (
    onReportsChange: (reps: MarketReport[]) => void,
    onUsersChange: (usrs: User[]) => void,
    onLogsChange: (logs: ActivityLog[]) => void,
    onNotificationsChange: (notifs: Notification[]) => void
  ): () => void => {
    if (!isFirebaseActive()) {
      return () => {}; // No-op in mock
    }

    console.log("[DbService] Registering real-time listeners on live Firestore collections...");
    
    // In actual production, developers instantiate Firestore onSnapshot listeners here:
    // 
    // const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('date', 'desc')), (snap) => {
    //   const reps: MarketReport[] = [];
    //   snap.forEach(d => reps.push(d.data() as MarketReport));
    //   liveReportsCache = reps;
    //   onReportsChange(reps);
    // });
    //
    // Repeat for users, logs, notifications, and return a merged unsub function.

    // Standard fallback listeners to fetch initial items in live mode
    getDocs(collection(db, 'reports')).then((snap) => {
      const items: MarketReport[] = [];
      snap.forEach(d => items.push(d.data() as MarketReport));
      liveReportsCache = items;
      onReportsChange(items);
    });

    getDocs(collection(db, 'users')).then((snap) => {
      const items: User[] = [];
      snap.forEach(d => items.push(d.data() as User));
      liveUsersCache = items;
      onUsersChange(items);
    });

    getDocs(collection(db, 'activity_logs')).then((snap) => {
      const items: ActivityLog[] = [];
      snap.forEach(d => items.push(d.data() as ActivityLog));
      liveLogsCache = items;
      onLogsChange(items);
    });

    getDocs(collection(db, 'notifications')).then((snap) => {
      const items: Notification[] = [];
      snap.forEach(d => items.push(d.data() as Notification));
      liveNotificationsCache = items;
      onNotificationsChange(items);
    });

    return () => {
      console.log("[DbService] Unsubscribed real-time queries.");
    };
  }
};
